import os
import re
import time
import urllib3
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime
from typing import Optional

# SSL 인증서 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# [보안] 환경변수 사용
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[오류] 환경 변수 SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE = "https://www.kyonggi.ac.kr"

# 보조 매핑
CATEGORY_MAP = {
    "수강에서 성적까지": "학사",
    "학사": "학사",
    "장학": "장학",
    "입학에서 취업까지": "취업",
    "취업": "취업",
    "행사": "행사",
    "비교과": "비교과",
    "일반": "일반",
}

def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def parse_date_to_iso(date_text: str) -> Optional[str]:
    s = normalize_text(date_text)
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).isoformat()
        except ValueError:
            pass
    return None

#  링크 정규화 함수: 원본의 bbsNo와 key를 살려서 WAF 차단 방지
def get_clean_link(raw_link: str) -> str:
    # 1. nttNo(게시물 번호) 추출
    ntt_match = re.search(r'nttNo=(\d+)', raw_link)
    
    if ntt_match:
        ntt_no = ntt_match.group(1)
        
        # 2. bbsNo(게시판 번호) 추출 (없으면 기본값 1073)
        bbs_match = re.search(r'bbsNo=(\d+)', raw_link)
        bbs_no = bbs_match.group(1) if bbs_match else "1073"
        
        # 3. key 추출 (없으면 기본값 7520)
        key_match = re.search(r'key=(\d+)', raw_link)
        key = key_match.group(1) if key_match else "7520"

        # 4. 올바른 파라미터 조합으로 재조립
        return f"{BASE}/www/selectBbsNttView.do?key={key}&bbsNo={bbs_no}&nttNo={ntt_no}"
    
    # nttNo가 없는 특수 링크라면 원래대로
    return (BASE + raw_link) if raw_link.startswith("/") else raw_link

def get_category(raw_category: str, title: str) -> str:
    clean_title = normalize_text(title)
    clean_raw = normalize_text(raw_category)
    text = f"{clean_title} {clean_raw}"
    
    if re.search(r"장학금|장학|국가근로|학자금|대출|생활비", text): return "장학"
    if re.search(r"등록금|분납|납부|환불|고지서|등록\b", text): return "등록"
    if re.search(r"취업|채용|인턴|현장실습|진로|멘토링|추천채용|사업단", text): return "취업"
    if re.search(r"기숙사|생활관|드림타워|입사|퇴사|관생|셔틀|버스|주차|식당|메뉴|학식|보건|진료|분실물|예비군", text): return "생활"
    if re.search(r"행사|특강|모집|대회|공모전|봉사|서포터즈|프로그램|설명회|축제", text): return "행사"
    if re.search(r"수강|성적|졸업|휴학|복학|전과|계절학기|학사일정", text): return "학사"

    mapped = CATEGORY_MAP.get(clean_raw)
    return mapped if mapped else "일반"

def crawl_kyonggi_univ(page_from: int = 1, page_to: int = 5):
    print("경기대학교 공지사항 수집 시작 (WAF 우회 패치)...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.kyonggi.ac.kr/",
    }

    bbs_no = 1073
    key = 7520
    total_count = 0
    
    for page_num in range(page_from, page_to + 1):
        target_url = f"{BASE}/www/selectBbsNttList.do?key={key}&bbsNo={bbs_no}&pageIndex={page_num}"
        print(f"\n페이지 {page_num} 수집 중...", end=" ")

        try:
            res = requests.get(target_url, headers=headers, timeout=15, verify=False)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            rows = soup.select("table tbody tr")

            if not rows:
                print("게시물 없음", end="")
                continue

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 3: continue

                a = tds[2].find("a")
                if not a: continue

                title = normalize_text(a.get_text())
                href = (a.get("href") or "").strip()
                if not href: continue

                #  링크 정규화 (bbsNo 자동 감지)
                link = get_clean_link(href)
                
                # 본문 수집
                content_text = f"원문 링크: {link}"
                try:
                    detail_res = requests.get(link, headers=headers, timeout=5, verify=False)
                    if detail_res.status_code == 200:
                        detail_soup = BeautifulSoup(detail_res.text, "html.parser")
                        view_content = detail_soup.select_one(".view_content")
                        if view_content:
                            content_text = view_content.get_text(strip=True)
                except Exception:
                    pass 

                # 날짜 및 카테고리
                raw_category = normalize_text(tds[1].get_text()) if len(tds) > 1 else ""
                date_text = normalize_text(tds[-1].get_text())
                posted_at = parse_date_to_iso(date_text)
                category = get_category(raw_category, title)

                data = {
                    "title": title,
                    "category": category,
                    "link": link,
                    "content": content_text,
                    "summary": "AI 요약 대기 중",
                    "status": "pending",
                    "posted_at": posted_at,
                    "created_at": posted_at if posted_at else datetime.now().isoformat(),
                    "deadline": None,
                    "created_at_raw": date_text,
                    "raw_category": raw_category,
                }

                # 중복 방지 (link 기준)
                supabase.table("notices").upsert(data, on_conflict="link").execute()
                total_count += 1
                print(".", end="")

            time.sleep(0.3)

        except Exception as e:
            print(f"\n에러 발생: {e}")

    print(f"\n\n수집 완료: 총 {total_count}건 처리됨")

if __name__ == "__main__":
    crawl_kyonggi_univ()

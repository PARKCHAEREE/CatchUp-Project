import os
import re
import time
import requests
import urllib3
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime
from typing import Optional

# [설정] SSL 인증서 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# [설정] Supabase 환경변수 확인
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ [오류] 환경 변수 SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# [설정] 공통 상수
BASE_URL = "https://www.kyonggi.ac.kr"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
}

# 보조 매핑 (기본 매핑용)
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

# --- [Helper Functions] ---

def normalize_text(s: str) -> str:
    """공백 제거 및 텍스트 정규화"""
    return re.sub(r"\s+", " ", (s or "").strip())

def parse_date_to_iso(date_text: str) -> Optional[str]:
    """다양한 날짜 형식을 ISO 포맷으로 변환"""
    s = normalize_text(date_text)
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).isoformat()
        except ValueError:
            pass
    return datetime.now().isoformat()  # 실패 시 현재 시간

def get_clean_link(raw_link: str) -> str:
    """
    링크 정규화 및 WAF 우회 처리
    - jsessionid 제거
    - bbsNo, nttNo 파라미터 재조립하여 접근 허용된 URL 생성
    """
    # 1. jsessionid 제거 (AI 개발자 의도 반영)
    raw_link = re.sub(r";jsessionid=[^?]+", "", raw_link)

    # 2. 파라미터 추출 및 재조립 (채리님 코드: WAF 우회 핵심)
    ntt_match = re.search(r'nttNo=(\d+)', raw_link)
    if ntt_match:
        ntt_no = ntt_match.group(1)
        
        bbs_match = re.search(r'bbsNo=(\d+)', raw_link)
        bbs_no = bbs_match.group(1) if bbs_match else "1073"
        
        key_match = re.search(r'key=(\d+)', raw_link)
        key = key_match.group(1) if key_match else "7520"

        return f"{BASE_URL}/www/selectBbsNttView.do?key={key}&bbsNo={bbs_no}&nttNo={ntt_no}"
    
    # 3. 상대 경로 처리
    if raw_link.startswith("./"):
        return f"{BASE_URL}/www{raw_link[1:]}"
    if raw_link.startswith("/"):
        return f"{BASE_URL}{raw_link}"
        
    return raw_link

def get_category(raw_category: str, title: str) -> str:
    """
    제목과 원본 카테고리를 기반으로 정확한 분류 도출
    (채리님의 정규식 로직 + AI 개발자의 매핑 로직 결합)
    """
    clean_title = normalize_text(title)
    clean_raw = normalize_text(raw_category)
    text = f"{clean_title} {clean_raw}"
    
    if re.search(r"장학금|장학|국가|근로|학자금|대출|생활비", text): return "장학"
    if re.search(r"등록금|분납|납부|환불|고지서|등록\b", text): return "등록"
    if re.search(r"취업|채용|인턴|현장실습|진로|멘토링|추천채용|사업단", text): return "취업"
    if re.search(r"기숙사|생활관|드림타워|입사|퇴사|관생|셔틀|버스|주차|식당|메뉴|학식|보건|진료|분실물|예비군", text): return "생활"
    if re.search(r"행사|특강|모집|대회|공모전|봉사|서포터즈|프로그램|설명회|축제", text): return "행사"
    if re.search(r"수강|성적|졸업|휴학|복학|전과|계절학기|학사일정", text): return "학사"

    return CATEGORY_MAP.get(clean_raw, "일반")

def fetch_notice_content(url: str) -> str:
    """
    상세 페이지 본문 수집 (Robust Logic)
    1순위: .view_content 클래스 (정확도 높음)
    2순위: 가장 긴 텍스트 블록 탐색 (AI 개발자 방식, 범용성 높음)
    """
    try:
        res = requests.get(url, headers=HEADERS, timeout=10, verify=False)
        if res.status_code != 200:
            return f"접속 실패 (Status: {res.status_code})"
            
        soup = BeautifulSoup(res.text, "html.parser")

        # 1. 불필요 태그 제거
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            tag.decompose()

        # 2. [채리님 방식] 정확한 클래스 타겟팅
        view_content = soup.select_one(".view_content")
        if view_content:
            text = view_content.get_text("\n", strip=True)
            if len(text) > 50: # 내용이 충분하면 리턴
                return text

        # 3. [AI 개발자 방식] 실패 시, 본문 후보군 탐색 (Heuristic)
        candidates = []
        for tag in soup.select("div, table td"): # div나 td 내의 텍스트 탐색
            text = tag.get_text("\n", strip=True)
            if len(text) > 100: # 의미있는 길이만 후보 등록
                candidates.append(text)
        
        if candidates:
            # 가장 긴 텍스트를 본문으로 간주
            return max(candidates, key=len)

        return "본문 내용을 추출할 수 없습니다."

    except Exception as e:
        return f"본문 수집 중 에러: {str(e)}"

# --- [Main Crawler] ---

def crawl_kyonggi_univ(page_from: int = 1, page_to: int = 5):
    print(f"🚀 경기대학교 공지사항 수집 시작 ({page_from}p ~ {page_to}p)")
    
    total_count = 0
    bbs_no = 1073
    key = 7520
    
    for page_num in range(page_from, page_to + 1):
        target_url = f"{BASE_URL}/www/selectBbsNttList.do?key={key}&bbsNo={bbs_no}&pageIndex={page_num}"
        print(f"\n📄 페이지 {page_num} 읽는 중...", end=" ")

        try:
            res = requests.get(target_url, headers=HEADERS, timeout=15, verify=False)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            rows = soup.select("table tbody tr")

            if not rows:
                print("게시물 없음 (종료)", end="")
                break

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 3: continue

                a_tag = tds[2].find("a")
                if not a_tag: continue

                # 기본 정보 추출
                raw_title = a_tag.get_text(strip=True)
                raw_href = a_tag.get("href", "")
                
                # 데이터 정제
                title = normalize_text(raw_title)
                link = get_clean_link(raw_href) # WAF 우회 링크 생성
                
                if not link: continue

                # 날짜 및 카테고리
                raw_category = normalize_text(tds[1].get_text()) if len(tds) > 1 else ""
                date_text = normalize_text(tds[-1].get_text())
                posted_at = parse_date_to_iso(date_text)
                category = get_category(raw_category, title)

                # 본문 수집 (AI 분석을 위해 필수)
                content_text = fetch_notice_content(link)

                # DB 적재 데이터 구성
                data = {
                    "title": title,
                    "category": category,
                    "link": link,
                    "content": content_text,
                    "summary": "AI 분석 대기 중", # AI 개발자와 약속된 상태 메시지
                    "status": "pending",
                    "posted_at": posted_at,
                    "created_at": datetime.now().isoformat(),
                    "deadline": None, # AI가 나중에 채워줄 필드
                    "source_type": "WEB"
                }

                # Supabase Upsert (link 기준 중복 방지)
                try:
                    supabase.table("notices").upsert(data, on_conflict="link").execute()
                    total_count += 1
                    print(".", end="")
                except Exception as db_err:
                    print(f"!", end="") # DB 에러 시 느낌표 표시

            time.sleep(0.5) # 서버 부하 방지 딜레이

        except Exception as e:
            print(f"\n[페이지 처리 에러] {e}")

    print(f"\n\n✅ 수집 완료: 총 {total_count}건 업데이트됨")

if __name__ == "__main__":
    # GitHub Actions 등에서 페이지 범위를 조정하고 싶다면 인자로 받을 수 있게 확장 가능
    crawl_kyonggi_univ(1, 15)

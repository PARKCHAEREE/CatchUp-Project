import os
import re
import time
import requests
import urllib3
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime
from typing import Optional

# SSL 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 환경 변수 로드
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 환경 변수 누락")
    raise SystemExit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://www.kyonggi.ac.kr"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": BASE_URL,
}

CATEGORY_MAP = {
    "수강에서 성적까지": "학사",
    "학사": "학사",
    "장학": "장학",
    "입학에서 취업까지": "취업",
    "취업": "취업",
    "행사": "행사",
    "비교과": "비교과",
    "대학생활/업무안내": "생활",
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

def get_clean_link(raw_link: str) -> str:
    if not raw_link:
        return ""
    raw_link = raw_link.strip()

    if raw_link.lower().startswith("javascript:"):
        return ""

    if raw_link.startswith("./"):
        raw_link = f"{BASE_URL}/www{raw_link[1:]}"
    elif raw_link.startswith("/"):
        raw_link = f"{BASE_URL}{raw_link}"

    raw_link = re.sub(r";jsessionid=[^?]+", "", raw_link)

    if "selectBbsNttView.do" in raw_link and "nttNo=" in raw_link:
        return raw_link

    ntt_match = re.search(r"nttNo=(\d+)", raw_link)
    if ntt_match:
        ntt_no = ntt_match.group(1)
        bbs_match = re.search(r"bbsNo=(\d+)", raw_link)
        bbs_no = bbs_match.group(1) if bbs_match else "1073"
        key_match = re.search(r"key=(\d+)", raw_link)
        key = key_match.group(1) if key_match else "7520"
        return f"{BASE_URL}/www/selectBbsNttView.do?key={key}&bbsNo={bbs_no}&nttNo={ntt_no}"

    return raw_link

def get_category(raw_category: str, title: str) -> str:
    text = f"{normalize_text(title)} {normalize_text(raw_category)}"

    if re.search(r"장학금|장학|근로|학자금|대출|생활비", text): return "장학"
    if re.search(r"등록금|분납|납부|환불|고지서|등록\b", text): return "등록"
    if re.search(r"취업|채용|인턴|현장실습|진로|멘토링|추천채용|사업단", text): return "취업"
    if re.search(r"기숙사|생활관|드림타워|입사|퇴사|관생|셔틀|버스|주차|식당|메뉴|학식|보건|진료|분실물|예비군", text): return "생활"
    if re.search(r"행사|특강|모집|대회|공모전|봉사|서포터즈|프로그램|설명회|축제", text): return "행사"
    if re.search(r"수강|성적|졸업|휴학|복학|전과|계절학기|학사일정|학위", text): return "학사"

    return CATEGORY_MAP.get(normalize_text(raw_category), "일반")

def fetch_notice_content(url: str) -> str:
    try:
        res = requests.get(url, headers=HEADERS, timeout=10, verify=False)
        if res.status_code != 200:
            return f"접속 실패 ({res.status_code})"

        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            tag.decompose()

        view_content = soup.select_one(".view_content")
        if view_content:
            text = view_content.get_text("\n", strip=True)
            if len(text) > 50:
                return text

        candidates = []
        for tag in soup.select("div, table td"):
            text = tag.get_text("\n", strip=True)
            if len(text) > 100:
                candidates.append(text)

        return max(candidates, key=len) if candidates else "본문 추출 실패"

    except Exception as e:
        return f"본문 수집 에러: {str(e)}"

def crawl_kyonggi_univ(page_from: int = 1, page_to: int = 5):
    print(f"경기대학교 공지사항 수집 시작")

    total_count = 0
    bbs_no = 1073
    key = 7520

    for page_num in range(page_from, page_to + 1):
        target_url = f"{BASE_URL}/www/selectBbsNttList.do?key={key}&bbsNo={bbs_no}&pageIndex={page_num}"
        print(f"\n페이지 {page_num} 처리 중...", end=" ")

        try:
            res = requests.get(target_url, headers=HEADERS, timeout=15, verify=False)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")
            rows = soup.select("table tbody tr")

            if not rows:
                break

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 3: continue

                a_tag = tds[2].find("a")
                if not a_tag: continue

                title = normalize_text(a_tag.get_text(strip=True))
                link = get_clean_link(a_tag.get("href", ""))
                if not link: continue

                raw_category = normalize_text(tds[1].get_text())
                date_text = normalize_text(tds[-1].get_text())

                # DB 저장 데이터 구성
                data = {
                    "title": title,
                    "category": get_category(raw_category, title),
                    "link": link,
                    "content": fetch_notice_content(link),
                    "summary": "AI 분석 대기 중",
                    "status": "pending",
                    "deadline": None,
                    
                    # [중요] 날짜 관련 필드
                    "posted_at": parse_date_to_iso(date_text), # 정렬용 실제 날짜
                    "created_at_raw": date_text,               # 원본 날짜 (DB 컬럼명에 맞춤)
                    
                    # [중요] 원본 카테고리 (데이터 누락 방지)
                    "raw_category": raw_category,
                    
                    "created_at": datetime.now().isoformat(),
                    "source_type": "WEB",
                }

                supabase.table("notices").upsert(data, on_conflict="link").execute()
                total_count += 1
                print(".", end="")

            time.sleep(0.5)

        except Exception as e:
            print(f"\n에러: {e}")

    print(f"\n\n완료: {total_count}건")

if __name__ == "__main__":
    crawl_kyonggi_univ()

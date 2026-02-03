import os
import re
import time
import requests
import urllib3
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime

# [설정] SSL 인증서 경고 무시
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE 환경 변수가 설정되지 않았습니다.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 기본 설정
DOMAIN_URL = "https://www.kyonggi.ac.kr"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": DOMAIN_URL,
}

# 카테고리 매핑
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

# Utils
def normalize_link(href: str) -> str:
    """링크 정규화"""
    if not href: return None
    href = re.sub(r";jsessionid=[^?]+", "", href)
    if href.startswith("./"):
        return f"{DOMAIN_URL}/www{href[1:]}"
    if href.startswith("/"):
        return f"{DOMAIN_URL}{href}"
    return href

def fetch_notice_content(url: str) -> str:
    """본문 수집"""
    time.sleep(0.3)
    try:
        res = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            tag.decompose()

        candidates = []
        # 1. view_content 클래스 우선
        view_content = soup.select_one(".view_content")
        if view_content:
            text = view_content.get_text("\n", strip=True)
            if len(text) > 50: return text

        # 2. 실패 시 태그 탐색
        for tag in soup.select("table td, div"):
            text = tag.get_text("\n", strip=True)
            if len(text) > 100: candidates.append(text)

        if not candidates: return "본문 내용 없음"
        return max(candidates, key=len)

    except Exception:
        return "본문 수집 실패"

def parse_date(date_text: str):
    """날짜 변환 헬퍼"""
    date_text = date_text.strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_text, fmt)
        except ValueError:
            pass
    return datetime.now()

# Main Crawler
def crawl_kyonggi_univ():
    print("경기대학교 통합 공지사항 크롤링 시작")

    total_count = 0
    
    # 1페이지부터 15페이지까지
    for page_num in range(1, 16):
        print(f"\n페이지 {page_num} 수집 중...", end=" ")

        list_url = f"{DOMAIN_URL}/www/selectBbsNttList.do?key=7520&bbsNo=1073&pageIndex={page_num}"

        try:
            res = requests.get(list_url, headers=HEADERS, timeout=15, verify=False)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")

            rows = soup.select("table tbody tr")
            if not rows: break

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 7: continue

                # --- [수정] 원본 데이터 확보 ---
                raw_category = tds[1].get_text(strip=True)
                raw_date = tds[6].get_text(strip=True)
                
                category = CATEGORY_MAP.get(raw_category, "기타")

                a_tag = tds[2].find("a")
                if not a_tag: continue
                
                title = a_tag.get_text(strip=True)
                link = normalize_link(a_tag.get("href", ""))
                if not link: continue

                # 본문 수집
                content_text = fetch_notice_content(link)

                # --- [수정] DB 스키마에 맞춰 데이터 구성 ---
                posted_at = parse_date(raw_date).isoformat()
                
                notice_data = {
                    "title": title,
                    "content": content_text,
                    "category": category,
                    "link": link,
                    "summary": "AI 분석 대기 중",
                    "status": "pending",
                    "deadline": None,
                    # -- 추가된 필수 필드 --
                    "raw_category": raw_category,   # DB 필수
                    "posted_at": posted_at,         # DB 필수 (공지 작성일)
                    "created_at": datetime.now().isoformat(), # 수집 시점
                    "created_at_raw": raw_date,     # 원본 날짜 텍스트
                    "source_type": "WEB"            # 출처 구분
                }

                try:
                    supabase.table("notices").upsert(
                        notice_data,
                        on_conflict="link"
                    ).execute()
                    total_count += 1
                    print(".", end="")
                except Exception as db_err:
                    print(f"!", end="")

        except Exception as e:
            print(f"\n페이지 로드 에러: {e}")

    print(f"\n\n✅ 수집 완료: 총 {total_count}건 저장됨")

if __name__ == "__main__":
    crawl_kyonggi_univ()

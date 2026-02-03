import os
import re
import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime

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
}

# Utils
def normalize_link(href: str) -> str:
    """
    경기대 공지 링크 정규화
    - jsessionid 제거
    - ./ → /www/ 보정
    - 절대경로 변환
    """
    if not href:
        return None

    # jsessionid 제거
    href = re.sub(r";jsessionid=[^?]+", "", href)

    # ./selectBbs... → /www/selectBbs...
    if href.startswith("./"):
        return f"{DOMAIN_URL}/www{href[1:]}"

    if href.startswith("/"):
        return f"{DOMAIN_URL}{href}"

    return href


def fetch_notice_content(url: str) -> str:
    time.sleep(0.3)

    res = requests.get(url, headers=HEADERS, timeout=15)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    # 불필요 태그 제거
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        tag.decompose()

    # 본문 후보 요소 수집 
    candidates = []

    # table 기반 공지
    for td in soup.select("table td"):
        text = td.get_text("\n", strip=True)
        if len(text) > 100:
            candidates.append(text)

    # div 기반 공지
    for div in soup.select("div"):
        text = div.get_text("\n", strip=True)
        if len(text) > 100:
            candidates.append(text)

    if not candidates:
        raise Exception("본문 후보를 찾을 수 없음")

    # 가장 긴 텍스트를 본문으로 선택
    content = max(candidates, key=len)

    if len(content) < 200:
        raise Exception("본문 텍스트가 너무 짧음")

    return content

# Main Crawler
def crawl_kyonggi_univ():
    print("경기대학교 통합 공지사항 크롤링 시작")

    for page_num in range(1, 16):
        print(f"\n페이지 {page_num} 수집 중...", end=" ")

        list_url = (
            f"{DOMAIN_URL}/www/selectBbsNttList.do"
            f"?key=7520&bbsNo=1073&pageIndex={page_num}"
        )

        try:
            res = requests.get(list_url, headers=HEADERS, timeout=15)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")

            rows = soup.select("table tbody tr")
            success_count = 0

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 7:
                    continue

                # 카테고리
                raw_category = tds[1].get_text(strip=True)
                category = CATEGORY_MAP.get(raw_category, "기타")

                # 제목 / 링크
                a_tag = tds[2].find("a")
                if not a_tag:
                    continue

                title = a_tag.get_text(strip=True)
                raw_href = a_tag.get("href", "")
                link = normalize_link(raw_href)

                if not link:
                    continue

                # 작성일
                date_text = tds[6].get_text(strip=True)
                try:
                    created_at = datetime.strptime(date_text, "%Y-%m-%d")
                except:
                    try:
                        created_at = datetime.strptime(date_text, "%Y.%m.%d")
                    except:
                        created_at = datetime.now()

                # 본문 크롤링
                try:
                    content_text = fetch_notice_content(link)
                except Exception as e:
                    print(f"\n[Skip] 본문 수집 실패: {link}\n이유: {e}")
                    continue

                notice_data = {
                    "title": title,
                    "category": category,
                    "link": link,
                    "content": content_text,
                    "summary": "AI 분석 대기 중",
                    "deadline": None,
                    "status": "pending",
                    "created_at": created_at.isoformat(),
                }

                try:
                    supabase.table("notices").upsert(
                        notice_data,
                        on_conflict="link"
                    ).execute()
                    success_count += 1
                    print(".", end="")
                except Exception as db_err:
                    print(f"\n[DB Error] {db_err}")

            print(f" {success_count}개 완료")

        except Exception as e:
            print(f"\n페이지 로드 에러: {e}")

    print("\n✅ 공지사항 수집 완료 (본문 포함)")


# Run
if __name__ == "__main__":
    crawl_kyonggi_univ()

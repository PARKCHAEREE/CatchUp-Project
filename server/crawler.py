import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime
import time
import urllib3 # [수정] SSL 경고 제어를 위해 추가

# [수정] 보안 경고 메시지 끄기 (SSL 인증서 에러 방지)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kxdqmwgukkvhbtnasjdj.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_AGLaY5wo2ahKBPpFL_P3eg_XOfD5QJv")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE = "https://www.kyonggi.ac.kr"

# 경기대 공지 고정 카테고리 매핑
CATEGORY_MAP = {
    "수강에서 성적까지": "학사",
    "학사": "학사",
    "장학": "장학",
    "입학에서 취업까지": "취업",
    "취업": "취업",
    "행사": "행사",
    "비교과": "비교과",
}

def crawl_kyonggi_univ():
    print("경기대학교 통합 공지사항 수집 시작..")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.kyonggi.ac.kr/",
    }

    for page_num in range(1, 16):
        print(f"\n페이지 수집 중...", end=" ")

        target_url = f"{BASE}/www/selectBbsNttList.do?key=7520&bbsNo=1073&pageIndex={page_num}"

        try:
            # [수정] verify=False 추가 (SSL 에러 해결)
            res = requests.get(target_url, headers=headers, timeout=10, verify=False)
            res.raise_for_status()
            soup = BeautifulSoup(res.text, "html.parser")

            rows = soup.select("table tbody tr")
            count = 0

            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 7:
                    continue

                # 사이트 제공 카테고리
                raw_category = tds[1].get_text(strip=True)
                app_category = CATEGORY_MAP.get(raw_category, "기타")

                # 제목 / 링크
                a = tds[2].find("a")
                if not a:
                    continue

                title_text = a.get_text(strip=True)
                href = a.get("href", "")
                full_link = BASE + href if href.startswith("/") else href

                # 작성일 (컴퓨터용 날짜로 변환) 
                date_text = tds[6].get_text(strip=True)
                try:
                    created_at = datetime.strptime(date_text, "%Y-%m-%d")
                except:
                    try:
                        created_at = datetime.strptime(date_text, "%Y.%m.%d")
                    except:
                        continue  # 날짜 파싱 안 되면 스킵

                notice_data = {
                    "title": title_text,
                    "category": app_category,
                    "link": full_link,
                    "content": f"원문 링크: {full_link}",
                    "deadline": None,
                    "summary": "AI 분석 대기 중",
                    "status": "pending",
                    "created_at": created_at.isoformat(),
                    "created_at_raw": date_text, 
                }

                # 중복 방지
                supabase.table("notices").upsert(
                    notice_data,
                    on_conflict="link"
                ).execute()

                print(".", end="")
                count += 1

            print(f" {count}개 완료", end="")
            time.sleep(0.5)

        except Exception as e:
            print(f"\n에러 발생: {e}")

    print("\n\n수집 완료(AI 분석 대기 상태)")

if __name__ == "__main__":
    crawl_kyonggi_univ()
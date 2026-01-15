import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from datetime import datetime, timedelta
import time

SUPABASE_URL = "https://kxdqmwgukkvhbtnasjdj.supabase.co"
SUPABASE_KEY = "sb_publishable_AGLaY5wo2ahKBPpFL_P3eg_XOfD5QJv"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE = "https://www.kyonggi.ac.kr"

def crawl_kyonggi_univ():
    print("🐢 경기대학교 공지사항 크롤링 시작 (1~15페이지)...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.kyonggi.ac.kr/",
    }

    for page_num in range(1, 16):
        print(f"\n📄 {page_num}페이지 읽는 중...", end=" ")

        target_url = f"{BASE}/www/selectBbsNttList.do?key=7520&bbsNo=1073&pageIndex={page_num}"

        try:
            res = requests.get(target_url, headers=headers, timeout=10)
            res.raise_for_status()
            res.encoding = "utf-8"
            soup = BeautifulSoup(res.text, "html.parser")

            # ✅ 핵심: tbody tr + td로 파싱 (클래스 의존 X)
            rows = soup.select("table tbody tr")

            count = 0
            for row in rows:
                tds = row.find_all("td")
                if len(tds) < 7:
                    continue  # 헤더/빈줄 제외

                raw_category = tds[1].get_text(strip=True)

                # 제목/링크는 3번째 칸에 a가 있음
                a = tds[2].find("a")
                if not a:
                    continue
                title_text = a.get_text(strip=True)
                href = a.get("href", "")
                full_link = BASE + href if href.startswith("/") else href

                # 작성일은 7번째 칸
                date_text = tds[6].get_text(strip=True)  # 예: 2026-01-15
                try:
                    created_date = datetime.strptime(date_text, "%Y-%m-%d")
                except:
                    # 혹시 다른 포맷이 섞이면 대비
                    try:
                        created_date = datetime.strptime(date_text, "%Y.%m.%d")
                    except:
                        created_date = datetime.now()

                # 카테고리 매핑 (기존 로직 유지하되 raw_category가 "수강에서 성적까지" 같은 값임)
                if any(x in raw_category for x in ["수강", "성적", "학사", "졸업", "일반", "수강에서 성적까지"]):
                    app_category = "학사"
                elif any(x in raw_category for x in ["장학", "등록금"]):
                    app_category = "장학"
                elif any(x in raw_category for x in ["취업", "진로", "입학", "현장실습", "LINC", "입학에서 취업까지"]):
                    app_category = "취업"
                elif any(x in raw_category for x in ["행사", "모집", "봉사", "대회", "특강"]):
                    app_category = "행사"
                elif "비교과" in raw_category:
                    app_category = "비교과"
                else:
                    app_category = "기타"

                deadline_date = created_date + timedelta(days=14)

                notice_data = {
                    "title": title_text,
                    "category": app_category,
                    "link": full_link,
                    "content": f"원본 링크: {full_link}",
                    "deadline": deadline_date.isoformat(),
                    "summary": "AI 요약 대기중...",
                }

                # (중복 방지 권장) link 기준 upsert 하려면 DB에 unique 제약 필요
                supabase.table("notices").insert(notice_data).execute()
                print(".", end="")
                count += 1

            if count > 0:
                print(f" {count}개 완료!", end="")
            else:
                print(" (공지 없음)", end="")

            time.sleep(0.5)

        except Exception as e:
            print(f"\n🚫 에러: {e}")

    print("\n\n🎉 15페이지 크롤링 완료! 앱을 켜보세요.")

if __name__ == "__main__":
    crawl_kyonggi_univ()

import time
# main_llm에서 필요한 도구 가져오기
from main_llm import analyze_notice, validate_case_a_result, supabase

def batch_process():
    print("[시작] 분석 대기 중인(pending) 공지사항을 조회합니다...")

    response = supabase.table("notices").select("*").eq("status", "pending").execute()
    notices = response.data

    if not notices:
        print("분석할 새로운 공지사항이 없습니다.")
        return

    print(f" 총 {len(notices)}개의 공지사항을 찾았습니다. 천천히 분석합니다 (속도 제한 준수)...\n")

    success_count = 0
    fail_count = 0

    for notice in notices:
        print(f" ID {notice['id']} 분석 중...", end=" ")
        
        try:
            # 1. AI 분석
            parsed = analyze_notice(notice["content"])
            
            # 2. 결과 검증
            validate_case_a_result(parsed)

            # 3. DB 저장
            update_data = {
                "summary": parsed["summary"],
                "category": parsed["category"],
                "deadline": parsed["deadline"],
                "status": "done"
            }
            
            supabase.table("notices").update(update_data).eq("id", notice["id"]).execute()
            print("성공! ")
            success_count += 1
            
        except Exception as e:
            print(f"실패  ({e})")
            # 실패해도 다음 것으로 넘어감 (나중에 다시 실행하면 됨)
            fail_count += 1
            
        # [중요] 구글 무료 등급(RPM 5~15)에 걸리지 않게 15초 쉼
        print("   (15초 대기 중...)") 
        time.sleep(15)

    print(f"\n[완료] 성공: {success_count}건, 실패: {fail_count}건")

if __name__ == "__main__":
    batch_process()
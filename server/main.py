from fastapi import FastAPI, UploadFile, File, HTTPException, Form 
# [추가] 데이터 검증(Pydantic)과 선택적 값(Optional) 처리를 위한 모듈 임포트
from pydantic import BaseModel
from typing import Optional
import os
import json
import re
from datetime import datetime

import google.generativeai as genai
from supabase import create_client, Client


# ======================
# 환경 변수
# ======================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE env vars are not set")


# ======================
# Gemini 설정
# ======================
genai.configure(api_key=GEMINI_API_KEY)

# [수정] 최신 안정화 버전 모델명으로 변경 (에러 방지)
model = genai.GenerativeModel("gemini-flash-latest")


# ======================
# Supabase 설정
# ======================
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ======================
# FastAPI
# ======================
app = FastAPI()

ALLOWED_CATEGORIES = {"학사", "장학", "등록", "취업", "생활", "행사", "비교과", "일반"}


# ======================
# [추가] 데이터 모델 (텍스트 요청용)
# ======================
class TextPayload(BaseModel):
    text: str
    user_deadline: Optional[str] = None


# ======================
# Utils
# ======================
def clean_json_text(text: str) -> str:
    """
    Gemini 응답에서 ```json ``` 같은 래퍼 제거
    """
    text = text.strip()
    text = re.sub(r"^```json", "", text)
    text = re.sub(r"^```", "", text)
    text = re.sub(r"```$", "", text)
    return text.strip()


def validate_result(data: dict):
    required_keys = {"title", "summary", "category", "deadline"}
    if not required_keys.issubset(data.keys()):
        raise ValueError("필수 필드 누락")

    # [수정] 카테고리가 AI 실수로 이상하게 오면 '일반'으로 처리 (에러 방지)
    if data["category"] not in ALLOWED_CATEGORIES:
        data["category"] = "일반"

    summary_lines = data["summary"].split("\n")
    # 요약 줄 수 검사는 유연하게 패스

    if data["deadline"] is not None:
        try:
            datetime.strptime(data["deadline"], "%Y-%m-%d")
        except ValueError:
            # [수정] 날짜 형식이 틀리면 에러 대신 NULL로 처리
            data["deadline"] = None


# [수정] 이미지용 Gemini 호출 함수
def call_gemini_image(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    response = model.generate_content([
        prompt,
        {
            "mime_type": mime_type,
            "data": image_bytes
        }
    ])
    return response.text

# [추가] 텍스트용 Gemini 호출 함수
def call_gemini_text(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text


# ======================
# API 1: 이미지 분석 (기존 기능 + 마감일 설정 추가)
# ======================
@app.post("/api/case-b")
async def case_b(
    image: UploadFile = File(...),
    # [추가] 사용자가 직접 설정한 마감일 받기 (선택사항)
    user_deadline: Optional[str] = Form(None) 
):
    if image.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPG/PNG/JPG allowed")

    image_bytes = await image.read()

    prompt = """
    이미지를 보고 대학생 일정이라면 아래 JSON 형식으로만 출력해라.
    반드시 JSON만 반환해라.

    {
      "title": "",
      "summary": "3줄 요약 (\\n으로 줄바꿈)",
      "category": "학사|장학|등록|취업|생활|행사|비교과|일반",
      "deadline": "YYYY-MM-DD 또는 null"
    }
    """

    last_error = None

    for attempt in range(2):
        try:
            raw_text = call_gemini_image(prompt, image_bytes, image.content_type)
            cleaned = clean_json_text(raw_text)
            parsed = json.loads(cleaned)

            validate_result(parsed)

            # [추가] 사용자가 입력한 마감일이 있으면 그걸 우선 사용!
            final_deadline = user_deadline if user_deadline else parsed["deadline"]

            insert_data = {
                "title": parsed["title"],
                "summary": parsed["summary"],
                "category": parsed["category"],
                "deadline": final_deadline, # [수정] 최종 결정된 마감일 사용
                
                "content": f"이미지 업로드 일정_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
                "source_type": "IMAGE",
                "link": None,
                "status": "published",
                "posted_at": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "created_at_raw": None,
                "raw_category": parsed["category"]
            }

            result = supabase.table("notices").insert(insert_data).execute()
            
            if not result.data:
                raise Exception("DB 저장 실패")

            saved = result.data[0]

            return {
                "id": saved["id"],
                "title": saved["title"],
                "summary": saved["summary"],
                "category": saved["category"],
                "deadline": saved["deadline"],
                "retry": attempt,
            }

        except Exception as e:
            last_error = str(e)
            print(f"Image Error: {e}")

    raise HTTPException(
        status_code=422,
        detail=f"AI 결과 검증 실패: {last_error}"
    )


# ======================
# API 2: 텍스트 분석 (완전 신규 추가)
# ======================
@app.post("/api/analyze-text")
async def analyze_text(payload: TextPayload):
    text_content = payload.text
    user_deadline = payload.user_deadline

    # 텍스트용 프롬프트
    prompt = f"""
    아래 텍스트는 대학 공지사항이나 일정 내용이다. 분석해서 JSON으로 출력해라.
    
    [텍스트 내용]
    {text_content}

    [출력 양식]
    {{
      "title": "한 줄 제목 요약",
      "summary": "3줄 요약 (\\n으로 줄바꿈)",
      "category": "학사|장학|등록|취업|생활|행사|비교과|일반",
      "deadline": "YYYY-MM-DD 또는 null (텍스트에 날짜가 명확하면 추출, 없으면 null)"
    }}
    """

    last_error = None
    for attempt in range(2):
        try:
            # 텍스트 분석 함수 호출
            raw_text = call_gemini_text(prompt)
            cleaned = clean_json_text(raw_text)
            parsed = json.loads(cleaned)
            validate_result(parsed)

            # 사용자가 입력한 마감일 우선 적용
            final_deadline = user_deadline if user_deadline else parsed["deadline"]

            insert_data = {
                "title": parsed["title"],
                "summary": parsed["summary"],
                "category": parsed["category"],
                "deadline": final_deadline,
                "content": text_content, # [중요] 텍스트 원본 저장
                "source_type": "TEXT",   # [중요] 타입은 TEXT
                "link": None,
                "status": "published",
                "posted_at": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "raw_category": parsed["category"]
            }

            result = supabase.table("notices").insert(insert_data).execute()
            if not result.data: raise Exception("DB 저장 실패")
            return result.data[0]

        except Exception as e:
            last_error = str(e)
            print(f"Text Error: {e}")

    raise HTTPException(status_code=422, detail=f"텍스트 분석 실패: {last_error}")
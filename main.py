from fastapi import FastAPI, UploadFile, File, HTTPException
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
model = genai.GenerativeModel("gemini-flash-latest")


# ======================
# Supabase 설정
# ======================
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ======================
# FastAPI
# ======================
app = FastAPI()

ALLOWED_CATEGORIES = {"학사", "장학", "취업", "행사", "비교과"}


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

    if data["category"] not in ALLOWED_CATEGORIES:
        raise ValueError("category 오류")

    summary_lines = data["summary"].split("\n")
    if len(summary_lines) != 3:
        raise ValueError("summary는 반드시 3줄")

    if data["deadline"] is not None:
        try:
            datetime.strptime(data["deadline"], "%Y-%m-%d")
        except ValueError:
            raise ValueError("deadline 형식 오류")


def call_gemini(prompt: str, image_bytes: bytes, mime_type: str) -> str:
    response = model.generate_content([
        prompt,
        {
            "mime_type": mime_type,
            "data": image_bytes
        }
    ])
    return response.text


# ======================
# API
# ======================
@app.post("/api/case-b")
async def case_b(image: UploadFile = File(...)):
    if image.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Only JPG/PNG allowed")

    image_bytes = await image.read()

    prompt = """
이미지를 보고 대학생 일정이라면 아래 JSON 형식으로만 출력해라.
반드시 JSON만 반환해라.

{
  "title": "",
  "summary": "3줄 요약 (\\n으로 줄바꿈)",
  "category": "학사|장학|취업|행사|비교과",
  "deadline": "YYYY-MM-DD 또는 null"
}
"""

    last_error = None

    for attempt in range(2):
        try:
            raw_text = call_gemini(prompt, image_bytes, image.content_type)
            cleaned = clean_json_text(raw_text)
            parsed = json.loads(cleaned)

            validate_result(parsed)

            insert_data = {
                "title": parsed["title"],
                "summary": parsed["summary"],
                "category": parsed["category"],
                "deadline": parsed["deadline"],
                "source_type": "IMAGE",
                "source_ref_id": None,
                "source_url": None,
            }

            result = supabase.table("schedules").insert(insert_data).execute()
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

    raise HTTPException(
        status_code=422,
        detail=f"AI 결과 검증 실패: {last_error}"
    )

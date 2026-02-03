from fastapi import FastAPI, HTTPException
import os
import json
import re
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

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

# Gemini 설정
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-flash-latest")

# Supabase 설정
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPI
app = FastAPI()

ALLOWED_CATEGORIES = {"학사", "장학", "취업", "행사", "비교과"}

# Utils
def clean_json_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```json", "", text)
    text = re.sub(r"^```", "", text)
    text = re.sub(r"```$", "", text)
    return text.strip()


def validate_case_a_result(data: dict):
    required_keys = {"summary", "category", "deadline"}
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


def call_gemini_text(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text


def analyze_notice(content_text: str) -> dict:
    prompt = f"""
너는 대학교 공지사항을 분석하는 AI 비서다.

아래는 대학교 공지사항의 본문 전체 텍스트이다.

[지시]
1. 공지의 핵심 내용을 정확히 3줄로 요약하라.
2. 공지 성격에 따라 category를 다음 중 하나로 분류하라.
   - 학사, 장학, 취업, 행사, 비교과
3. 공지에 명시된 마감일 또는 주요 일정 날짜가 있다면
   YYYY-MM-DD 형식으로 deadline에 넣고,
   없으면 null로 설정하라.

[출력 규칙]
- 반드시 JSON만 출력
- 설명 문장 절대 금지

{{
  "summary": "3줄 요약 (\\n으로 줄바꿈)",
  "category": "학사|장학|취업|행사|비교과",
  "deadline": "YYYY-MM-DD 또는 null"
}}

[공지 본문]
{content_text}
"""

    raw_text = call_gemini_text(prompt)
    cleaned = clean_json_text(raw_text)
    return json.loads(cleaned)


# API (Case A)
@app.post("/api/case-a")
async def case_a(
    notice_id: int, #notices 테이블 PK
    content_text: str #크롤링한 공지 본문 텍스트
):

    last_error = None

    for attempt in range(2):
        try:
            parsed = analyze_notice(content_text)
            validate_case_a_result(parsed)

            update_data = {
                "summary": parsed["summary"],
                "category": parsed["category"],
                "deadline": parsed["deadline"],
                "status": "done",
            }

            result = (
                supabase
                .table("notices")          
                .update(update_data)
                .eq("id", notice_id)
                .execute()
            )

            if not result.data:
                raise Exception("DB 업데이트 실패")

            saved = result.data[0]

            return {
                "id": saved["id"],
                "summary": saved["summary"],
                "category": saved["category"],
                "deadline": saved["deadline"],
                "retry": attempt,
            }

        except Exception as e:
            last_error = str(e)

    raise HTTPException(
        status_code=422,
        detail=f"Case A AI 결과 검증 실패: {last_error}"
    )

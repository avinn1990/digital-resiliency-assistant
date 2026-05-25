import json
import re
from typing import Any

from fastapi import HTTPException
from openai import OpenAI

from app.config import settings
from app.prompts import SYSTEM_PROMPT


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured. Add your key to the llm-conversation service environment.",
        )
    kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def _parse_json_content(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        raise HTTPException(
            status_code=502,
            detail="LLM returned invalid JSON. Try again.",
        ) from None


async def complete_json(user_prompt: str) -> dict[str, Any]:
    client = _client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return _parse_json_content(content)

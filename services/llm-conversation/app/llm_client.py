import json
import re
import sys
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from openai import OpenAI

from app.prompts import SYSTEM_PROMPT

_REPO_ROOT = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[4],
)
sys.path.insert(0, str(_REPO_ROOT / "shared" / "python"))
from env_constants import OPENAI_API_KEY as ENV_OPENAI_API_KEY  # noqa: E402
from openai_env import (  # noqa: E402
    OPENAI_MODEL,
    is_openai_configured,
    openai_client_kwargs,
)


def _client() -> OpenAI:
    if not is_openai_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                f"{ENV_OPENAI_API_KEY} is not set. "
                "Export your OpenAI key as an environment variable before starting this service."
            ),
        )
    return OpenAI(**openai_client_kwargs())


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


def _complete_json_sync(user_prompt: str) -> dict[str, Any]:
    client = _client()
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content or "{}"
    return _parse_json_content(content)


async def complete_json(user_prompt: str) -> dict[str, Any]:
    import asyncio

    return await asyncio.to_thread(_complete_json_sync, user_prompt)

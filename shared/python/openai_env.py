"""
OpenAI environment variables — single source of truth for the whole repository.

Required:
  OPENAI_API_KEY

Optional:
  OPENAI_MODEL       (default: gpt-4o-mini)
  OPENAI_BASE_URL    (custom / Azure-compatible endpoint)
"""

import os

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_BASE_URL: str | None = os.getenv("OPENAI_BASE_URL", "").strip() or None


def is_openai_configured() -> bool:
    return bool(OPENAI_API_KEY)


def openai_client_kwargs() -> dict:
    if not OPENAI_API_KEY:
        return {}
    kwargs: dict = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    return kwargs

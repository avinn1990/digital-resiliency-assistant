import sys
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[2],
)
sys.path.insert(0, str(_REPO_ROOT / "shared" / "python"))
from openai_env import (  # noqa: E402
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    is_openai_configured,
)
from service_url import normalize_service_url  # noqa: E402


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    conversation_service_url: str = "http://localhost:8001"
    assessment_service_url: str = "http://localhost:8002"
    framework_service_url: str = "http://localhost:8003"
    llm_conversation_service_url: str = "http://localhost:8004"
    google_client_id: str = ""
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    auth_required: bool = False
    database_url: str = ""
    # Comma-separated browser origins (scheme + host, no path), e.g. https://digitally-resilient.com
    cors_origins: str = ""

    @property
    def cors_allowed_origins(self) -> list[str]:
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://digitally-resilient.com",
            "https://www.digitally-resilient.com",
        ]
        extra = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        seen: set[str] = set()
        merged: list[str] = []
        for origin in defaults + extra:
            if origin not in seen:
                seen.add(origin)
                merged.append(origin)
        return merged

    @field_validator(
        "conversation_service_url",
        "assessment_service_url",
        "framework_service_url",
        "llm_conversation_service_url",
        mode="before",
    )
    @classmethod
    def normalize_urls(cls, value: str) -> str:
        return normalize_service_url(value)

    @property
    def openai_configured(self) -> bool:
        return is_openai_configured()

    @property
    def auth_enabled(self) -> bool:
        return bool(self.google_client_id.strip() and self.jwt_secret.strip())

    @property
    def database_enabled(self) -> bool:
        return bool(self.database_url.strip())


settings = Settings()

# Re-export for other backend modules
__all__ = [
    "settings",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_BASE_URL",
    "is_openai_configured",
]

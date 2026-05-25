import sys
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[2],
)
sys.path.insert(0, str(_REPO_ROOT / "shared" / "python"))
from service_url import normalize_service_url  # noqa: E402


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    conversation_service_url: str = "http://localhost:8001"
    assessment_service_url: str = "http://localhost:8002"
    framework_service_url: str = "http://localhost:8003"

    @field_validator(
        "conversation_service_url",
        "assessment_service_url",
        "framework_service_url",
        mode="before",
    )
    @classmethod
    def normalize_urls(cls, value: str) -> str:
        return normalize_service_url(value)


settings = Settings()

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_evaluation_dir() -> Path:
    root = next(
        (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
        Path(__file__).resolve().parents[4],
    )
    return (
        root
        / "evaluation-services"
        / "Information Security Strategy and Planning Services"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str | None = None
    evaluation_service_dir: str = ""
    default_service_id: str = "information-security-strategy-planning"

    def evaluation_dir(self) -> Path:
        if self.evaluation_service_dir.strip():
            return Path(self.evaluation_service_dir)
        return _default_evaluation_dir()


settings = Settings()

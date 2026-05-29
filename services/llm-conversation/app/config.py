import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = next(
    (p for p in Path(__file__).resolve().parents if (p / "render.yaml").is_file()),
    Path(__file__).resolve().parents[3],
)
sys.path.insert(0, str(_REPO_ROOT / "shared" / "python"))
from env_constants import OPENAI_API_KEY as ENV_OPENAI_API_KEY  # noqa: E402
from openai_env import is_openai_configured  # noqa: E402


def _default_evaluation_dir() -> Path:
    return (
        _REPO_ROOT
        / "evaluation-services"
        / "Information Security Strategy and Planning Services"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    evaluation_service_dir: str = ""
    evaluation_services_dir: str = ""
    default_service_id: str = "information-security-strategy-planning"

    def evaluation_dir(self) -> Path:
        if self.evaluation_service_dir.strip():
            return Path(self.evaluation_service_dir)
        return _default_evaluation_dir()

    def evaluation_services_root(self) -> Path:
        if self.evaluation_services_dir.strip():
            return Path(self.evaluation_services_dir)
        return _REPO_ROOT / "evaluation-services"

    @property
    def llm_ready(self) -> bool:
        return is_openai_configured()


settings = Settings()

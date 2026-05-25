from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    conversation_service_url: str = "http://localhost:8001"
    assessment_service_url: str = "http://localhost:8002"
    framework_service_url: str = "http://localhost:8003"


settings = Settings()

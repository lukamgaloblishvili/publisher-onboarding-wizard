from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_DIR = BASE_DIR / "alembic"


class Settings(BaseSettings):
    app_name: str = "PX Onboarding Wizard API"
    environment: str = "development"
    secret_key: str = "dev-only-change-me"
    data_encryption_key: str | None = None
    session_cookie_name: str = "px_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 14
    session_cookie_secure: bool = False
    database_url: str = "postgresql+psycopg://px:px_password@127.0.0.1:5432/px_onboarding_wizard"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    upload_dir: str = str(BASE_DIR / "app" / "uploads")
    use_mock_integrations: bool = True
    jira_base_url: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None
    integration_sync_interval_seconds: int = 300
    integration_auto_sync_enabled: bool = True
    monday_api_token: str | None = None
    max_upload_bytes: int = 5 * 1024 * 1024
    alembic_ini_path: str = str(BASE_DIR / "alembic.ini")
    alembic_script_location: str = str(ALEMBIC_DIR)

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def validate_secrets(self):
        non_production_environments = {"development", "dev", "local", "test"}
        if self.environment.lower() not in non_production_environments and self.secret_key in {
            "change-me",
            "dev-only-change-me",
        }:
            raise ValueError("SECRET_KEY must be changed outside local development")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

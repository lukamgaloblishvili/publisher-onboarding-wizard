from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "PX Onboarding Wizard API"
    environment: str = "development"
    secret_key: str = "change-me"
    session_cookie_name: str = "px_session"
    database_url: str = f"sqlite:///{(BASE_DIR / 'px_wizard.db').as_posix()}"
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

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

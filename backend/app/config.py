"""Application settings loaded from environment / .env file.

NOTE: Spec §4.2 lists CLERK_JWKS_URL and CLERK_ISSUER as required, but the
project owner explicitly approved making them optional with empty defaults
so the backend can boot without Clerk credentials. When either is empty,
the `require_user` dependency returns HTTP 503 ("Clerk no configurado")
and a single WARNING is logged at app startup.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///../db/todo_list.db"
    schema_path: str = "../db/schema.sql"

    # Logging
    log_level: str = "INFO"
    log_file: str = "../logs/task_manager_backend.log"
    log_to_console: bool = True

    # Clerk (intentionally optional with empty defaults — see module docstring)
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_audience: str = ""

    # CORS — comma-separated list, parsed via the property below
    cors_origins: str = "http://localhost:5173"

    # uvicorn bind
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def clerk_configured(self) -> bool:
        return bool(self.clerk_jwks_url) and bool(self.clerk_issuer)


settings = Settings()

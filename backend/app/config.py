from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-insecure-secret-change-me-before-production"
# HS256 needs at least 32 bytes of key (RFC 7518 3.2).
MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    """App settings, read from env vars (prefix MEOW_) or a .env file."""

    model_config = SettingsConfigDict(env_prefix="MEOW_", env_file=".env")

    env: Literal["dev", "production"] = "dev"

    # SQLite in dev; set to postgresql+psycopg://... for test/prod.
    database_url: str = "sqlite:////data/meowdoption.sqlite3"

    # JWT signing key. Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"
    secret_key: SecretStr = SecretStr(DEV_SECRET)
    access_token_minutes: int = 8 * 60
    # Secure cookies are only sent over HTTPS; dev runs on plain http.
    cookie_secure: bool = False

    # Dev/e2e convenience: seed creates this admin if both are set.
    dev_admin_email: str | None = None
    dev_admin_password: SecretStr | None = None

    @model_validator(mode="after")
    def _production_safety(self) -> "Settings":
        if self.env == "production":
            secret = self.secret_key.get_secret_value()
            if secret == DEV_SECRET:
                raise ValueError("MEOW_SECRET_KEY must be set in production")
            if len(secret) < MIN_SECRET_LENGTH:
                raise ValueError(f"MEOW_SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters")
            if not self.cookie_secure:
                raise ValueError("MEOW_COOKIE_SECURE must be true in production")
            if self.dev_admin_email or self.dev_admin_password:
                raise ValueError("MEOW_DEV_ADMIN_* must not be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

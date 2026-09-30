from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from env vars (prefix MEOW_) or a .env file."""

    model_config = SettingsConfigDict(env_prefix="MEOW_", env_file=".env")

    # SQLite in dev; set to postgresql+psycopg://... for test/prod.
    database_url: str = "sqlite:////data/meowdoption.sqlite3"


@lru_cache
def get_settings() -> Settings:
    return Settings()

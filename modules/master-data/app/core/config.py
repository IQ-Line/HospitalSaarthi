from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MASTER_DATA_", env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://hims:hims@localhost:5432/hims_dev",
        description="SQLAlchemy database URL for the Master Data module.",
    )
    api_prefix: str = "/api/master-data"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:4200,http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()

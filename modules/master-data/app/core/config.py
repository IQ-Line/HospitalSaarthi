from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load `.env` from this package root (works when CWD is not `modules/master-data`).
_PACKAGE_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MASTER_DATA_",
        env_file=_PACKAGE_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+psycopg://hims:hims@localhost:5433/hims_dev",
        description="SQLAlchemy database URL for the Master Data module.",
    )
    api_prefix: str = "/api/v1/master-data"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:4200,http://localhost:5173"
    log_request_body: bool = Field(
        default=False,
        description="If true, log decoded request body (truncated). Keep disabled by default for PHI/PII safety.",
    )
    log_response_body: bool = Field(
        default=False,
        description="If true, log decoded response body (truncated). Keep disabled by default for PHI/PII safety.",
    )
    log_max_body_bytes: int = Field(
        default=4096,
        description="Maximum bytes of request/response body to capture in logs.",
    )
    log_skip_paths: str = Field(
        default="/docs,/redoc,/openapi.json,/favicon.ico",
        description="Comma-separated path prefixes excluded from request logging.",
    )
    # Tests: ``require_superadmin`` skips bearer; audit actor stays null.
    auth_disabled: bool = Field(
        default=False,
        description="If true, skip JWT in superadmin dep (tests); audit columns unset.",
    )
    jwt_secret: str | None = Field(
        default=None,
        description=(
            "HS256 secret for validating JWTs; if unset, signatures are not verified (dev only)."
        ),
    )
    # Local/dev only — never enable bypass or dev token in production.
    auth_bypass: bool = Field(
        default=False,
        description=(
            "If true, mutation routes accept requests without a bearer token (Swagger/local only)."
        ),
    )
    dev_bearer_token: str | None = Field(
        default=None,
        description=(
            "If set, Authorization: Bearer <exact value> passes superadmin check; "
            "audit actor stays null until JWT ``sub`` is used."
        ),
    )

    @field_validator("dev_bearer_token", mode="before")
    @classmethod
    def strip_dev_bearer(cls, value: object) -> str | None:
        if value is None or value == "":
            return None
        if isinstance(value, str):
            return value.strip()
        return value  # pragma: no cover


@lru_cache
def get_settings() -> Settings:
    return Settings()

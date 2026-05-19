from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# `modules/master-data` — stable regardless of CWD.
_PACKAGE_ROOT = Path(__file__).resolve().parent.parent.parent


def _find_workspace_root(package_root: Path) -> Path:
    """Repo root (Nx monorepo). Matches Nx/Fastify: shared `.env` at workspace root."""
    for parent in package_root.parents:
        if (parent / "nx.json").is_file():
            return parent
    # Typical layout without `nx.json` (e.g. sparse tests): .../<repo>/modules/master-data
    if package_root.name == "master-data" and package_root.parent.name == "modules":
        return package_root.parent.parent
    return package_root


_WORKSPACE_ROOT = _find_workspace_root(_PACKAGE_ROOT)


def _master_data_env_files() -> tuple[Path, ...] | None:
    """Load workspace `.env` first, then optional package `.env` (local overrides)."""
    paths: list[Path] = []
    root_env = _WORKSPACE_ROOT / ".env"
    pkg_env = _PACKAGE_ROOT / ".env"
    if root_env.is_file():
        paths.append(root_env)
    if pkg_env.is_file() and pkg_env.resolve() != root_env.resolve():
        paths.append(pkg_env)
    return tuple(paths) if paths else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MASTER_DATA_",
        env_file=_master_data_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+psycopg://hims:hims@localhost:5433/hims-master",
        description="SQLAlchemy database URL for the Master Data module (`hims-master`).",
    )
    api_prefix: str = "/api/v1/master-data"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:4200,http://localhost:5173"
    log_request_body: bool = Field(
        default=False,
        description=(
            "If true, log decoded request body (truncated). "
            "Keep disabled by default for PHI/PII safety."
        ),
    )
    log_response_body: bool = Field(
        default=False,
        description=(
            "If true, log decoded response body (truncated). "
            "Keep disabled by default for PHI/PII safety."
        ),
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


def _resolve_database_url_from_env_files() -> str | None:
    """Read MASTER_DATA_DATABASE_URL from workspace `.env` when pydantic env_prefix skips it."""
    import os

    explicit = os.environ.get("MASTER_DATA_DATABASE_URL", "").strip()
    if explicit:
        return explicit

    try:
        from dotenv import dotenv_values
    except ImportError:
        return None

    for path in _master_data_env_files() or ():
        values = dotenv_values(path)
        url = (values.get("MASTER_DATA_DATABASE_URL") or "").strip()
        if url:
            return url
    return None


@lru_cache
def get_settings() -> Settings:
    url = _resolve_database_url_from_env_files()
    if url:
        return Settings(database_url=url)
    return Settings()


def reset_settings_cache_for_tests() -> None:
    """Clear cached settings (tests / after `.env` changes in long-lived shells)."""
    get_settings.cache_clear()
    from app.core.database import reset_database_engine

    reset_database_engine()

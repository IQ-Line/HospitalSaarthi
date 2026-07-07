from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
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
        default="postgresql+psycopg://hims:hims@localhost:5433/hims_dev",
        description=(
            "SQLAlchemy database URL for the Master Data module. "
            "Catalog lives in `master_global` and `master_tenant` schemas on `hims_dev`."
        ),
        # Prefixed MASTER_DATA_DATABASE_URL wins; falls back to the shared
        # DATABASE_URL (single hims_dev DB per ADR-0013). AliasChoices bypasses
        # env_prefix for this one field; other fields still use env_prefix.
        validation_alias=AliasChoices("MASTER_DATA_DATABASE_URL", "DATABASE_URL"),
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
    internal_api_key: str = Field(
        default="",
        description=(
            "Shared secret for internal service-to-service routes (sent in the "
            "`x-master-data-internal-key` header). Empty ⇒ internal routes are disabled and "
            "fail closed (503), never open. Set MASTER_DATA_INTERNAL_API_KEY in every env."
        ),
    )
    # Authorization is enforced in-process by the hims_authz PEP (identity gate + per-route
    # Cerbos guards, wired in app.main / app.core.authz). There are NO HS256 / bypass / dev-token
    # escape hatches — see AuthEnvSettings below for the JWKS/issuer/audience/Cerbos/UM config.


def _resolve_database_url_from_env_files() -> str | None:
    """Read the DB URL from process env / workspace `.env`.

    Prefixed ``MASTER_DATA_DATABASE_URL`` wins; falls back to the shared
    ``DATABASE_URL`` (single hims_dev DB per ADR-0013). Mirrors the field's
    ``AliasChoices`` precedence for the env-file path that ``env_prefix`` skips.
    """
    import os

    for key in ("MASTER_DATA_DATABASE_URL", "DATABASE_URL"):
        explicit = os.environ.get(key, "").strip()
        if explicit:
            return explicit

    try:
        from dotenv import dotenv_values
    except ImportError:
        return None

    # Last file wins (matches pydantic_settings env_file merge: package overrides root).
    resolved: str | None = None
    for path in _master_data_env_files() or ():
        values = dotenv_values(path)
        url = (values.get("MASTER_DATA_DATABASE_URL") or values.get("DATABASE_URL") or "").strip()
        if url:
            resolved = url
    return resolved


@lru_cache
def get_settings() -> Settings:
    url = _resolve_database_url_from_env_files()
    if url:
        return Settings(database_url=url)
    return Settings()


class AuthEnvSettings(BaseSettings):
    """In-process PEP configuration — JWKS/issuer/audience + Cerbos + UM principal URL.

    These are platform-wide auth values (not ``MASTER_DATA_``-prefixed): the edge JWKS, the
    JWT issuer/audience, the Cerbos PDP, and the User Management ``/auth/principal`` endpoint.
    Mirrors ``opd.core.config.AuthEnvSettings`` so one policy set governs both modules.
    """

    model_config = SettingsConfigDict(
        env_file=_master_data_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    jwks_url: str = Field(
        default="http://localhost:3000/api/auth/.well-known/jwks.json",
        validation_alias="JWKS_URL",
    )
    jwt_issuer: str = Field(default="http://localhost:3000", validation_alias="JWT_ISSUER")
    jwt_audience: str = Field(default="hims-platform", validation_alias="JWT_AUDIENCE")
    cerbos_http_url: str = Field(
        default="http://localhost:3592", validation_alias="CERBOS_HTTP_URL"
    )
    user_management_url: str = Field(
        default="http://localhost:3005", validation_alias="USER_MANAGEMENT_URL"
    )
    principal_path: str = Field(
        default="/api/user-management/auth/principal", validation_alias="UM_PRINCIPAL_PATH"
    )
    max_token_age_seconds: int = Field(
        default=300, validation_alias="JWT_MAX_TOKEN_AGE_SECONDS"
    )
    clock_skew_seconds: int = Field(default=60, validation_alias="JWT_CLOCK_SKEW_SECONDS")


@lru_cache
def get_auth_env_settings() -> AuthEnvSettings:
    return AuthEnvSettings()


def reset_settings_cache_for_tests() -> None:
    """Clear cached settings (tests / after `.env` changes in long-lived shells)."""
    get_settings.cache_clear()
    get_auth_env_settings.cache_clear()
    from app.core.database import reset_database_engine

    reset_database_engine()

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ``modules/opd`` — stable regardless of CWD.
_PACKAGE_ROOT = Path(__file__).resolve().parent.parent.parent.parent


def _find_workspace_root(package_root: Path) -> Path:
    for parent in package_root.parents:
        if (parent / "nx.json").is_file():
            return parent
    if package_root.name == "opd" and package_root.parent.name == "modules":
        return package_root.parent.parent
    return package_root


_WORKSPACE_ROOT = _find_workspace_root(_PACKAGE_ROOT)


def _opd_env_files() -> tuple[Path, ...] | None:
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
        env_prefix="OPD_",
        env_file=_opd_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+psycopg://hims:hims@localhost:5433/hims_dev",
        description="SQLAlchemy database URL for the OPD module.",
        # Prefixed OPD_DATABASE_URL wins; falls back to the shared DATABASE_URL
        # (single hims_dev DB per ADR-0013). AliasChoices bypasses env_prefix.
        validation_alias=AliasChoices("OPD_DATABASE_URL", "DATABASE_URL"),
    )
    api_prefix: str = "/api/v1/opd"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:4200,http://localhost:5173"
    abdm_m2_enabled: bool = Field(
        default=False,
        description="When true, end-consultation triggers integration-hub M2 orchestration.",
    )
    integration_hub_base_url: str = Field(
        default="http://localhost:3007",
        description="integration-hub-svc origin (no trailing path).",
    )
    record_foundation_base_url: str = Field(
        default="http://localhost:3009",
        description="record-foundation-svc origin (no trailing path).",
        validation_alias="RECORD_FOUNDATION_BASE_URL",
    )
    pdf_platform_url: str = Field(
        default="http://localhost:8091",
        description="pdf-platform worker origin (no trailing path).",
        validation_alias="PDF_PLATFORM_URL",
    )
    pdf_platform_api_key: str = Field(
        default="",
        description="Optional bearer token for pdf-platform.",
        validation_alias="PDF_PLATFORM_API_KEY",
    )
    pdf_platform_timeout_seconds: int = Field(
        default=125,
        description="HTTP timeout for pdf-platform render requests.",
    )
    master_data_url: str = Field(
        default="http://localhost:8010",
        description="master-data-svc origin for visitpad catalog lookups.",
    )
    master_data_timeout_seconds: int = Field(
        default=15,
        description="HTTP timeout for master-data catalog requests.",
    )


class AzureBlobSettings(BaseSettings):
    """Azure Blob Storage for patient health documents (workspace-root AZURE_* vars)."""

    model_config = SettingsConfigDict(
        env_file=_opd_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    connection_string: str = Field(default="", validation_alias="AZURE_STORAGE_CONNECTION_STRING")
    account_name: str = Field(default="", validation_alias="AZURE_STORAGE_ACCOUNT")
    account_key: str = Field(default="", validation_alias="AZURE_STORAGE_ACCOUNT_KEY")
    container_name: str = Field(
        default="hmis-patient-docs", validation_alias="AZURE_BLOB_CONTAINER"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_azure_blob_settings() -> AzureBlobSettings:
    return AzureBlobSettings()


class ServiceIntegrationSettings(BaseSettings):
    """Cross-service URLs and internal keys loaded from workspace root / package ``.env``."""

    model_config = SettingsConfigDict(
        env_file=_opd_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    pharmacy_url: str = Field(default="", validation_alias="PHARMACY_URL")
    pharmacy_internal_api_key: str = Field(default="", validation_alias="PHARMACY_INTERNAL_API_KEY")
    user_management_url: str = Field(
        default="http://localhost:3005",
        validation_alias="USER_MANAGEMENT_URL",
    )
    pdf_platform_url: str = Field(default="", validation_alias="PDF_PLATFORM_URL")
    pdf_platform_api_key: str = Field(default="", validation_alias="PDF_PLATFORM_API_KEY")
    report_web_origin: str = Field(default="", validation_alias="REPORT_WEB_ORIGIN")
    report_logo_url: str = Field(default="/reportLogo.svg", validation_alias="REPORT_LOGO_URL")
    facility_id: str = Field(
        default="",
        description="NDHM/HFR facility id (IN…) fallback when configurator profile is absent.",
        validation_alias="FACILITY_ID",
    )


@lru_cache
def get_service_integration_settings() -> ServiceIntegrationSettings:
    return ServiceIntegrationSettings()


class AuthEnvSettings(BaseSettings):
    """In-process PEP configuration — JWKS/issuer/audience + Cerbos + UM principal URL.

    These are platform-wide auth values (not ``OPD_``-prefixed): the edge JWKS, the JWT
    issuer/audience, the Cerbos PDP, and the User Management ``/auth/principal`` endpoint.
    """

    model_config = SettingsConfigDict(
        env_file=_opd_env_files(),
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
    """Clear cached settings (tests / after ``.env`` changes in long-lived shells)."""
    get_settings.cache_clear()
    get_azure_blob_settings.cache_clear()
    get_service_integration_settings.cache_clear()
    get_auth_env_settings.cache_clear()
    from opd.core.database import reset_database_engine
    from opd.lib import azure_blob_storage

    azure_blob_storage._blob_service_client.cache_clear()
    reset_database_engine()

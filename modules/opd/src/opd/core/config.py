from functools import lru_cache
from pathlib import Path

from pydantic import Field
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
        default="http://localhost:3004",
        description="record-foundation-svc origin (no trailing path).",
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
    container_name: str = Field(default="hmis-patient-docs", validation_alias="AZURE_BLOB_CONTAINER")


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_azure_blob_settings() -> AzureBlobSettings:
    return AzureBlobSettings()


def reset_settings_cache_for_tests() -> None:
    """Clear cached settings (tests / after `.env` changes in long-lived shells)."""
    get_settings.cache_clear()
    get_azure_blob_settings.cache_clear()
    from opd.core.database import reset_database_engine
    from opd.lib import azure_blob_storage

    azure_blob_storage._blob_service_client.cache_clear()
    reset_database_engine()

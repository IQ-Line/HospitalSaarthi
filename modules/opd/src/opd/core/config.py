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


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache_for_tests() -> None:
    """Clear cached settings (tests / after `.env` changes in long-lived shells)."""
    get_settings.cache_clear()
    from opd.core.database import reset_database_engine

    reset_database_engine()

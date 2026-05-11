"""Settings: platform tenant guardrails for deployed environments."""

from __future__ import annotations

import os
from uuid import UUID

import pytest

from app.core.config import _DEFAULT_PLATFORM_TENANT_ID, Settings, get_settings


@pytest.fixture()
def clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield None
    get_settings.cache_clear()


def test_rejects_placeholder_platform_tenant_when_master_data_app_env_is_production(
    clear_settings_cache: None,
) -> None:
    os.environ["MASTER_DATA_APP_ENV"] = "production"
    os.environ["MASTER_DATA_PLATFORM_TENANT_ID"] = str(_DEFAULT_PLATFORM_TENANT_ID)
    try:
        with pytest.raises(ValueError, match="MASTER_DATA_PLATFORM_TENANT_ID"):
            Settings()
    finally:
        os.environ.pop("MASTER_DATA_APP_ENV", None)
        os.environ.pop("MASTER_DATA_PLATFORM_TENANT_ID", None)


def test_allows_custom_platform_tenant_in_production(clear_settings_cache: None) -> None:
    custom = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    os.environ["MASTER_DATA_APP_ENV"] = "production"
    os.environ["MASTER_DATA_PLATFORM_TENANT_ID"] = custom
    try:
        s = Settings()
        assert s.platform_tenant_id == UUID(custom)
    finally:
        os.environ.pop("MASTER_DATA_APP_ENV", None)
        os.environ.pop("MASTER_DATA_PLATFORM_TENANT_ID", None)

"""Engine must rebind when settings cache is cleared (uvicorn reload / .env change)."""

from __future__ import annotations

import os

from app.core.config import get_settings, reset_settings_cache_for_tests
from app.core.database import get_engine, reset_database_engine


def test_engine_rebinds_after_settings_cache_clear(monkeypatch) -> None:
    monkeypatch.setenv("MASTER_DATA_DATABASE_URL", "postgresql+psycopg://a@localhost:5433/db-a")
    reset_settings_cache_for_tests()
    reset_database_engine()
    engine_a = get_engine()
    url_a = str(engine_a.url)

    monkeypatch.setenv("MASTER_DATA_DATABASE_URL", "postgresql+psycopg://b@localhost:5433/db-b")
    reset_settings_cache_for_tests()
    reset_database_engine()
    engine_b = get_engine()
    url_b = str(engine_b.url)

    assert "db-a" in url_a
    assert "db-b" in url_b
    assert url_a != url_b


def test_get_settings_reads_master_data_database_url_from_env(monkeypatch) -> None:
    monkeypatch.setenv(
        "MASTER_DATA_DATABASE_URL",
        "postgresql+psycopg://hims:hims@localhost:5433/hims-master",
    )
    reset_settings_cache_for_tests()
    settings = get_settings()
    assert settings.database_url.endswith("/hims-master")
    reset_settings_cache_for_tests()

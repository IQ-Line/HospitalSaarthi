"""SQLAlchemy engine and session factory (lazy-bound to current settings)."""

from __future__ import annotations

import logging
from collections.abc import Generator
from threading import Lock
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None
_bound_url: str | None = None
_lock = Lock()


def _engine_kwargs() -> dict:
    return {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 3600,
    }


def database_target_label(url: str) -> str:
    """Log-safe database target (host:port/dbname, no credentials)."""
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or ""
    db = (parsed.path or "").lstrip("/") or "?"
    return f"{host}:{port}/{db}" if port else f"{host}/{db}"


def _normalize_driver(url: str) -> str:
    """Force the psycopg (v3) driver so the shared ``postgresql://`` DATABASE_URL works.

    The unified ``DATABASE_URL`` is the Node/Drizzle form (``postgresql://``); plain
    SQLAlchemy would resolve that to the default psycopg2 dialect. The prefixed
    ``MASTER_DATA_DATABASE_URL`` override already uses ``postgresql+psycopg://`` and still wins.
    """
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def _bind_engine(url: str) -> Engine:
    """Create or reuse engine for ``url``. Caller must hold ``_lock``."""
    global _engine, _bound_url, _session_factory

    url = _normalize_driver(url)

    if _engine is not None and _bound_url == url:
        return _engine

    if _engine is not None:
        logger.info(
            "Recreating SQLAlchemy engine (%s -> %s)",
            database_target_label(_bound_url or ""),
            database_target_label(url),
        )
        _engine.dispose()

    _bound_url = url
    _session_factory = None
    _engine = create_engine(url, **_engine_kwargs())
    logger.info("SQLAlchemy engine bound to %s", database_target_label(url))
    return _engine


def get_engine() -> Engine:
    """Return the process engine, recreating it when ``database_url`` changes."""
    with _lock:
        return _bind_engine(get_settings().database_url)


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory

    with _lock:
        if _session_factory is None:
            engine = _bind_engine(get_settings().database_url)
            _session_factory = sessionmaker(
                bind=engine,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False,
            )
        return _session_factory


def reset_database_engine() -> None:
    """Dispose engine and session factory (call after settings cache clear)."""
    global _engine, _session_factory, _bound_url

    with _lock:
        if _engine is not None:
            _engine.dispose()
        _engine = None
        _session_factory = None
        _bound_url = None


def verify_database_connection() -> None:
    """Probe catalog DB at startup; logs target and error without crashing the process."""
    settings = get_settings()
    target = database_target_label(settings.database_url)
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error(
            "Master Data database connection failed for %s: %s",
            target,
            exc,
        )
        raise


def get_db_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

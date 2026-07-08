"""Real-Postgres/Citus integration fixtures (opt-in).

The SQLite unit suites carry genuine parity (every model has a matching
``sqlite_where`` beside its ``postgresql_where``), but they cannot exercise the
constraint under real Postgres nor Citus distribution-column semantics. These do.
The nx ``test:integration`` target provisions the URL and runs ``alembic upgrade
heads`` first; without ``TEST_DATABASE_URL`` every test here skips.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture()
def pg_session() -> Iterator[Session]:
    if _TEST_DATABASE_URL is None:
        pytest.skip("TEST_DATABASE_URL not set — real-Postgres integration is opt-in")
    engine = create_engine(_TEST_DATABASE_URL)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        engine.dispose()

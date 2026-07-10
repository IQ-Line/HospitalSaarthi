"""Real-Postgres/Citus integration fixtures (opt-in).

These run against a throwaway Postgres/Citus DB so they exercise behaviour SQLite
cannot: real schemas (``master_global`` / ``master_tenant``), partial-unique
indexes, ``ON CONFLICT`` bulk-import, self-referential FKs, and the PG SQL dialect
the handlers actually run in production. The nx ``test:integration`` target
provisions ``TEST_DATABASE_URL`` and runs ``alembic upgrade heads`` first; without
it every test here skips.

Isolation is per-test transaction rollback: each test runs inside an outer
transaction that is rolled back at teardown, and the app's own session (via the
``get_session`` override) joins it with SAVEPOINTs, so even committing request
handlers leave the shared DB pristine between tests. Migrations run once, up front.
"""

from __future__ import annotations

import os
from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from hims_authz import Authz
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.main import create_app
from app.models import Base

_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


_MODEL_SCHEMAS = tuple(sorted({t.schema for t in Base.metadata.sorted_tables if t.schema}))
# Every mapped table must live in a module schema — a schema-less model would silently
# escape the per-test TRUNCATE below and leak state across tests.
assert _MODEL_SCHEMAS == ("master_global", "master_tenant"), _MODEL_SCHEMAS


def _truncate_all(connection) -> None:
    """Empty every real table in the module schemas within the current transaction.

    Reads the live catalog rather than ``Base.metadata`` so it stays correct despite any
    ORM-vs-migration drift (some mapped tables aren't created by the current migrations).
    ``alembic_version`` lives in ``master_global`` (see ``alembic/env.py``) and is excluded:
    the TRUNCATE is unwound by the fixture's rollback today, but this helper must stay safe
    if ever invoked outside that transaction.
    """
    rows = connection.execute(
        text(
            "SELECT schemaname, tablename FROM pg_tables"
            " WHERE schemaname = ANY(:schemas) AND tablename <> 'alembic_version'"
        ),
        {"schemas": list(_MODEL_SCHEMAS)},
    ).all()
    if rows:
        tables = ", ".join(f'"{s}"."{t}"' for s, t in rows)
        connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture(scope="session")
def pg_engine() -> Iterator[Engine]:
    if _TEST_DATABASE_URL is None:
        pytest.skip("TEST_DATABASE_URL not set — real-Postgres integration is opt-in")
    engine = create_engine(_TEST_DATABASE_URL)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def pg_session(pg_engine: Engine) -> Iterator[Session]:
    """A real-PG session whose every effect is rolled back after the test.

    The outer ``transaction`` owns all writes; ``join_transaction_mode="create_savepoint"``
    turns any ``session.commit()`` (including the one the request handler issues) into a
    SAVEPOINT release rather than a real commit, so the final ``transaction.rollback()``
    unwinds the whole test. This is what lets count-based assertions (``total == 1``) hold
    on a shared database.
    """
    connection = pg_engine.connect()
    transaction = connection.begin()
    # Migrations seed the platform catalog (modules, permissions, …); SQLite gave every
    # test an empty schema. Truncate inside the outer transaction so tests start from the
    # same clean slate — the rollback below restores the seed rows for the next test.
    _truncate_all(connection)
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def pg_client(
    pg_session: Session,
    test_authz: Authz,
    auth_headers: dict[str, str],
) -> Iterator[TestClient]:
    """An authenticated TestClient whose requests run on the rolled-back ``pg_session``.

    Only ``get_session`` is overridden — the repositories still resolve their
    ``CatalogScope`` from the request's tenant header (no header → ``master_global``),
    so the real scope-routing is exercised rather than pinned.
    """
    app = create_app(deps={"authz": test_authz})

    def _session() -> Generator[Session, None, None]:
        yield pg_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app, headers=auth_headers) as client:
        yield client
    app.dependency_overrides.clear()

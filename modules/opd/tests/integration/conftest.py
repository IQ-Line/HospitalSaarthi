"""Real-Postgres/Citus integration fixtures (opt-in).

These run against a throwaway Postgres/Citus DB so they exercise behaviour SQLite
cannot: real schemas, ``tenant_id`` as the Citus distribution column, partial-unique
indexes, child-line FKs, and the PG SQL dialect the handlers run in production. The nx
``test:integration`` target provisions ``TEST_DATABASE_URL`` and runs ``alembic upgrade
heads`` first; without it every test here skips.

Isolation is per-test transaction rollback: each test runs inside an outer transaction
that is rolled back at teardown, and the request handler's own session joins it with
SAVEPOINTs (``join_transaction_mode="create_savepoint"``), so even committing handlers
leave the DB pristine. opd migrations seed no data, so an empty transaction is a clean
slate — no truncate needed.
"""

from __future__ import annotations

import os
from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from opd import create_app
from opd.core.schemas import SCHEMA
from opd.http_handlers.deps import get_session
from opd.models import Base
from tests.conftest import build_test_authz

_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


def _materialize_external_read_models(engine: Engine) -> None:
    """Create the cross-module read-model tables opd reads but does NOT own.

    opd's models include read copies of registration data (``registration.registration``,
    ``registration.visit``) — logical cross-schema references with no DB-level FK. In
    production the registration module owns those tables in the shared database; opd's own
    alembic migration deliberately never creates them. But the isolated per-module test DB
    (``hims_test_opd``) has no registration module, so opd's cross-schema reads would 404 on a
    missing relation. We materialize just those external tables here (as Citus reference tables,
    to compose with opd's distributed tables in one transaction) so the reads exercise real SQL.
    """
    external = [t for t in Base.metadata.sorted_tables if t.schema and t.schema != SCHEMA]
    schemas = {t.schema for t in external}
    with engine.begin() as conn:
        for schema in schemas:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
    Base.metadata.create_all(engine, tables=external, checkfirst=True)
    # On Citus, register them as reference tables so they compose with opd's distributed
    # tables in one transaction. Idempotent: the tables persist across runs, so skip any
    # already distributed. No-op on plain Postgres.
    with engine.begin() as conn:
        on_citus = conn.execute(
            text("SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table')")
        ).scalar()
        if on_citus:
            for t in external:
                already = conn.execute(
                    text(
                        "SELECT EXISTS (SELECT 1 FROM pg_dist_partition "
                        f"WHERE logicalrelid = '{t.schema}.{t.name}'::regclass)"
                    )
                ).scalar()
                if not already:
                    conn.execute(text(f"SELECT create_reference_table('{t.schema}.{t.name}')"))


@pytest.fixture(scope="session")
def pg_engine() -> Iterator[Engine]:
    if _TEST_DATABASE_URL is None:
        pytest.skip("TEST_DATABASE_URL not set — real-Postgres integration is opt-in")
    engine = create_engine(_TEST_DATABASE_URL)
    _materialize_external_read_models(engine)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db_session(pg_engine: Engine) -> Iterator[Session]:
    """A real-PG session whose every effect is rolled back after the test.

    The outer ``transaction`` owns all writes; ``join_transaction_mode="create_savepoint"``
    turns any ``session.commit()`` (including the request handler's) into a SAVEPOINT release
    rather than a real commit, so the final ``transaction.rollback()`` unwinds the whole test.
    """
    connection = pg_engine.connect()
    transaction = connection.begin()
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


# The prescription constraint suite predates this file under the name ``pg_session``.
@pytest.fixture()
def pg_session(db_session: Session) -> Session:
    return db_session


@pytest.fixture()
def prescription_repo(db_session: Session):
    from opd.data_access.prescription_repository import PrescriptionRepository

    return PrescriptionRepository(db_session)


@pytest.fixture()
def prescription_client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app(deps={"authz": build_test_authz()})

    def _session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

"""Real-Postgres/Citus integration fixtures (opt-in).

These run against a throwaway Postgres/Citus DB so they exercise what mocks cannot:
real schemas, ``tenant_id`` as the Citus distribution column, partial-unique
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

# empi tables opd reads via raw SQL only (``load_visit_patient_source``) — no ORM read-model
# exists, so they are mirrored here as DDL. Source of truth: the empi module's migration
# modules/empi/migrations/0001_init.sql (``empi.patients``, ``empi.patient_identifiers``).
# Only the columns opd's SQL touches (plus the PK) are mirrored; name/type/nullability MUST
# match the owner exactly — if empi's migration changes these columns, update this DDL.
#
# Citus mode: the owner distributes both by ``iq_tenant_id`` (0002_distribute_citus.sql).
# Here they deviate to REFERENCE tables, like the registration mirrors below, because Citus
# cannot plan ``load_visit_patient_source``'s correlated identifier subquery when distributed
# empi tables join the reference-materialized registration tables ("correlated subqueries are
# not supported when the FROM clause contains a reference table"). Production runs the
# all-distributed, colocated shape.
_EXTERNAL_RAW_SQL_TABLES: dict[tuple[str, str], str] = {
    ("empi", "patients"): """
        CREATE TABLE empi.patients (
            "id" uuid DEFAULT gen_random_uuid() NOT NULL,
            "iq_tenant_id" uuid NOT NULL,
            "abha_number" text,
            CONSTRAINT "patients_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
        )
    """,
    ("empi", "patient_identifiers"): """
        CREATE TABLE empi.patient_identifiers (
            "id" uuid DEFAULT gen_random_uuid() NOT NULL,
            "iq_tenant_id" uuid NOT NULL,
            "patient_id" uuid NOT NULL,
            "identifier_type" text NOT NULL,
            "identifier_value" text NOT NULL,
            "is_active" boolean DEFAULT true NOT NULL,
            CONSTRAINT "patient_identifiers_iq_tenant_id_id_pk" PRIMARY KEY("iq_tenant_id","id")
        )
    """,
}


def _materialize_external_read_models(engine: Engine) -> None:
    """Create the cross-module tables opd reads but does NOT own.

    opd reads registration data through ORM read-models (``registration.registration``,
    ``registration.visit``) and empi data through raw SQL (``empi.patients``,
    ``empi.patient_identifiers`` in ``load_visit_patient_source``) — logical cross-schema
    references with no DB-level FK. In production the owning modules create those tables in
    the shared database; opd's own alembic migration deliberately never creates them. But the
    isolated per-module test DB (``hims_test_opd``) has no other modules, so opd's cross-schema
    reads would fail on a missing relation. We materialize all four here (as Citus reference
    tables, to compose with opd's distributed tables in one transaction) so the cross-module
    reads exercise real SQL. Tables NOT mirrored here (``empi.patient_addresses``,
    ``configurator.*``) remain uncovered; code touching them is still unit-tested with mocks.

    The mirrors are dropped and recreated every session: the test DB persists across runs, so
    a mirror created by an older run could otherwise silently lack columns added since.
    """
    external = [t for t in Base.metadata.sorted_tables if t.schema and t.schema != SCHEMA]
    names = [(t.schema, t.name) for t in external] + list(_EXTERNAL_RAW_SQL_TABLES)
    with engine.begin() as conn:
        for schema in {schema for schema, _ in names}:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        for schema, table in names:
            conn.execute(text(f"DROP TABLE IF EXISTS {schema}.{table}"))
    Base.metadata.create_all(engine, tables=external)
    with engine.begin() as conn:
        for ddl in _EXTERNAL_RAW_SQL_TABLES.values():
            conn.execute(text(ddl))
        # On Citus, register them as reference tables so they compose with opd's distributed
        # tables in one transaction. No-op on plain Postgres.
        on_citus = conn.execute(
            text("SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table')")
        ).scalar()
        if on_citus:
            for schema, table in names:
                conn.execute(text(f"SELECT create_reference_table('{schema}.{table}')"))


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

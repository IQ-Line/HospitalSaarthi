"""Pytest fixtures for the OPD module."""

from __future__ import annotations

from collections.abc import Generator, Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from opd import create_app
from opd.core.schemas import SCHEMA
from opd.http_handlers.deps import get_session
from opd.models import Base

TENANT_A = UUID("00000000-0000-0000-0000-000000000001")
TENANT_B = UUID("00000000-0000-0000-0000-000000000002")
PATIENT_ID = UUID("00000000-0000-0000-0000-000000000010")
DOCTOR_ID = UUID("00000000-0000-0000-0000-000000000020")


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db_session(db_engine: Engine) -> Iterator[Session]:
    translate = {SCHEMA: None, "registration": None}
    with db_engine.connect().execution_options(schema_translate_map=translate) as setup_conn:
        for table in Base.metadata.tables.values():
            table.schema = None
        Base.metadata.create_all(bind=setup_conn)
        setup_conn.commit()

    connection = db_engine.connect().execution_options(schema_translate_map=translate)
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


@pytest.fixture()
def prescription_repo(db_session: Session):
    from opd.data_access.prescription_repository import PrescriptionRepository

    return PrescriptionRepository(db_session)


@pytest.fixture()
def prescription_client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def _session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_create_payload(
    *,
    tenant_id: UUID = TENANT_A,
    visit_id: UUID | None = None,
    patient_id: UUID = PATIENT_ID,
    doctor_id: UUID = DOCTOR_ID,
) -> dict:
    return {
        "tenant_id": str(tenant_id),
        "visit_id": str(visit_id or uuid4()),
        "patient_id": str(patient_id),
        "doctor_id": str(doctor_id),
        "clinical": {
            "chief_complaints": [
                {"line_no": 1, "complaint_text": "Fever"},
            ],
        },
    }

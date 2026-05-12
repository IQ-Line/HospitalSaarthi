"""Smoke tests for Visitpad catalog tables (Rx columns, medicines) on SQLite."""

from __future__ import annotations

from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_session
from app.main import create_app
from app.models import Base


@pytest.fixture()
def visitpad_catalog_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def visitpad_catalog_client(
    visitpad_catalog_sqlite_session: Session,
) -> Generator[TestClient, None, None]:
    app = create_app()

    def _session() -> Generator[Session, None, None]:
        yield visitpad_catalog_sqlite_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_visitpad_rx_column_duplicate_returns_409(visitpad_catalog_client: TestClient) -> None:
    body = {
        "section": "frequency",
        "display_name": "Daily",
        "code": "qd",
        "display_order": 0,
        "is_active": True,
    }
    r1 = visitpad_catalog_client.post("/api/v1/master-data/visitpad/rx-columns", json=body)
    assert r1.status_code == 201, r1.text
    r2 = visitpad_catalog_client.post("/api/v1/master-data/visitpad/rx-columns", json=body)
    assert r2.status_code == 409, r2.text


def test_visitpad_medicine_create_and_get(visitpad_catalog_client: TestClient) -> None:
    body = {
        "code": "asp-100",
        "display_name": "Aspirin 100mg",
        "generic_name": "Acetylsalicylic acid",
        "drug_class": "NSAID",
        "dosage_form": "tablet",
        "schedule": "otc",
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/medicines", json=body)
    assert r.status_code == 201, r.text
    mid = r.json()["data"]["id"]
    g = visitpad_catalog_client.get(f"/api/v1/master-data/visitpad/medicines/{mid}")
    assert g.status_code == 200
    assert g.json()["data"]["code"] == "asp-100"

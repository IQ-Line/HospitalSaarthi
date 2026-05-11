"""HTTP CRUD for Visitpad units + conversions against in-memory SQLite."""

from __future__ import annotations

from collections.abc import Generator, Iterator
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import (
    get_session,
    get_visitpad_unit_conversion_repository,
    get_visitpad_unit_repository,
)
from app.main import create_app
from app.models import Base
from app.repositories.visitpad_unit_conversion_repository import VisitpadUnitConversionRepository
from app.repositories.visitpad_unit_repository import VisitpadUnitRepository


@pytest.fixture()
def visitpad_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(_dbapi_connection, _connection_record) -> None:
        _dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def visitpad_client(visitpad_sqlite_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def _session() -> Generator[Session, None, None]:
        yield visitpad_sqlite_session

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_visitpad_unit_repository] = (
        lambda: VisitpadUnitRepository(visitpad_sqlite_session)
    )
    app.dependency_overrides[get_visitpad_unit_conversion_repository] = (
        lambda: VisitpadUnitConversionRepository(visitpad_sqlite_session)
    )
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_visitpad_units_and_conversions_crud(visitpad_client: TestClient) -> None:
    tid = "00000000-0000-0000-0000-000000000001"
    r_kg = visitpad_client.post(
        "/api/v1/master-data/visitpad/units",
        json={
            "code": "kg",
            "display_label": "Kilogram",
            "dimension": "mass",
            "is_canonical": True,
        },
    )
    assert r_kg.status_code == 201, r_kg.text
    assert r_kg.json()["data"]["tenant_id"] == tid

    r_g = visitpad_client.post(
        "/api/v1/master-data/visitpad/units",
        json={"code": "g", "display_label": "Gram", "dimension": "mass"},
    )
    assert r_g.status_code == 201

    lst = visitpad_client.get("/api/v1/master-data/visitpad/units?limit=10&offset=0")
    assert lst.status_code == 200
    assert lst.json()["total"] == 2

    conv = visitpad_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={
            "from_unit_code": "kg",
            "to_unit_code": "g",
            "factor": 1000.0,
            "offset_value": 0.0,
        },
    )
    assert conv.status_code == 201, conv.text
    cid = UUID(conv.json()["data"]["id"])

    bad = visitpad_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={"from_unit_code": "kg", "to_unit_code": "kg", "factor": 1.0},
    )
    assert bad.status_code == 400

    g = visitpad_client.get(f"/api/v1/master-data/visitpad/unit-conversions/{cid}")
    assert g.status_code == 200
    assert g.json()["data"]["factor"] == 1000.0

    dup = visitpad_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={"from_unit_code": "kg", "to_unit_code": "g", "factor": 2.0},
    )
    assert dup.status_code == 409

    patch_u = visitpad_client.patch(
        f"/api/v1/master-data/visitpad/units/{r_kg.json()['data']['id']}",
        json={"is_active": False},
    )
    assert patch_u.status_code == 200
    assert patch_u.json()["data"]["is_active"] is False

"""HTTP read tests for platform picklist catalog endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_picklist_repository, get_session
from app.main import create_app
from app.models import Base
from app.models.picklist import PicklistModel, PicklistValueModel
from app.repositories.picklist_repository import PicklistRepository


@pytest.fixture()
def picklist_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_attach(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS global_master")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def picklist_client(picklist_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()

    def _repo() -> PicklistRepository:
        return PicklistRepository(picklist_sqlite_session)

    def _session() -> Iterator[Session]:
        yield picklist_sqlite_session

    app.dependency_overrides[get_picklist_repository] = _repo
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _seed_picklist_with_values(session: Session) -> tuple[UUID, UUID]:
    picklist = PicklistModel(
        name="Gender",
        slug="gender",
        is_active=True,
        is_deleted=False,
    )
    session.add(picklist)
    session.flush()
    male = PicklistValueModel(
        category_id=picklist.id,
        value="male",
        label="Male",
        display_order=1,
        is_active=True,
        is_global=False,
    )
    female = PicklistValueModel(
        category_id=picklist.id,
        value="female",
        label="Female",
        display_order=2,
        is_active=True,
        is_global=False,
    )
    session.add_all([male, female])
    session.commit()
    session.refresh(picklist)
    session.refresh(male)
    return picklist.id, male.id


def test_list_picklists_empty(picklist_client: TestClient) -> None:
    response = picklist_client.get("/api/v1/master-data/picklists")
    assert response.status_code == 200
    body = response.json()
    assert body["data"] == []
    assert body["total"] == 0


def test_list_picklists_and_values(picklist_client: TestClient, picklist_sqlite_session: Session) -> None:
    picklist_id, value_id = _seed_picklist_with_values(picklist_sqlite_session)

    listed = picklist_client.get("/api/v1/master-data/picklists")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["data"][0]["slug"] == "gender"
    assert listed.json()["data"][0]["id"] == str(picklist_id)

    values = picklist_client.get(f"/api/v1/master-data/picklists/{picklist_id}/values")
    assert values.status_code == 200
    payload = values.json()
    assert payload["total"] == 2
    assert {row["value"] for row in payload["data"]} == {"male", "female"}
    assert payload["data"][0]["category_id"] == str(picklist_id)
    assert any(row["id"] == str(value_id) for row in payload["data"])


def test_list_picklist_values_pagination(
    picklist_client: TestClient,
    picklist_sqlite_session: Session,
) -> None:
    picklist_id, _ = _seed_picklist_with_values(picklist_sqlite_session)

    page = picklist_client.get(
        f"/api/v1/master-data/picklists/{picklist_id}/values",
        params={"limit": 1, "offset": 0},
    )
    assert page.status_code == 200
    assert page.json()["total"] == 2
    assert len(page.json()["data"]) == 1


def test_list_picklist_values_unknown_picklist(picklist_client: TestClient) -> None:
    response = picklist_client.get(f"/api/v1/master-data/picklists/{uuid4()}/values")
    assert response.status_code == 404

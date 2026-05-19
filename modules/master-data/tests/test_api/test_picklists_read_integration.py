"""HTTP read tests for picklist domain endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_picklist_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.models.picklist import PicklistPublicModel
from app.repositories.picklist_repository import PicklistRepository


@pytest.fixture()
def picklist_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS global_master")

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
        return PicklistRepository(picklist_sqlite_session, CatalogScope(iq_tenant_id=None))

    def _session() -> Iterator[Session]:
        yield picklist_sqlite_session

    app.dependency_overrides[get_picklist_repository] = _repo
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_picklist(picklist_sqlite_session: Session) -> PicklistPublicModel:
    row = PicklistPublicModel(name="Gender", slug="gender", is_active=True, is_deleted=False)
    picklist_sqlite_session.add(row)
    picklist_sqlite_session.commit()
    picklist_sqlite_session.refresh(row)
    return row


def test_list_picklists(picklist_client: TestClient, seeded_picklist: PicklistPublicModel) -> None:
    response = picklist_client.get("/api/v1/master-data/picklists")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["data"][0]["slug"] == seeded_picklist.slug


def test_get_picklist_by_id(picklist_client: TestClient, seeded_picklist: PicklistPublicModel) -> None:
    response = picklist_client.get(f"/api/v1/master-data/picklists/{seeded_picklist.id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(seeded_picklist.id)


def test_get_picklist_by_slug(picklist_client: TestClient, seeded_picklist: PicklistPublicModel) -> None:
    response = picklist_client.get("/api/v1/master-data/picklists/by-slug/gender")
    assert response.status_code == 200
    assert response.json()["data"]["slug"] == "gender"


def test_get_picklist_missing(picklist_client: TestClient) -> None:
    response = picklist_client.get(f"/api/v1/master-data/picklists/{uuid4()}")
    assert response.status_code == 404

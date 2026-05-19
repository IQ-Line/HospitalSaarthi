"""HTTP CRUD tests for picklist value (item) endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_picklist_repository, get_picklist_value_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.models.picklist import PicklistPublicModel
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.picklist_value_repository import PicklistValueRepository


@pytest.fixture()
def picklist_value_sqlite_session() -> Iterator[Session]:
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
def picklist_value_client(picklist_value_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()
    scope = CatalogScope(iq_tenant_id=None)

    def _picklist_repo() -> PicklistRepository:
        return PicklistRepository(picklist_value_sqlite_session, scope)

    def _value_repo() -> PicklistValueRepository:
        return PicklistValueRepository(picklist_value_sqlite_session, scope)

    def _session() -> Iterator[Session]:
        yield picklist_value_sqlite_session

    app.dependency_overrides[get_picklist_repository] = _picklist_repo
    app.dependency_overrides[get_picklist_value_repository] = _value_repo
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_picklist(picklist_value_sqlite_session: Session) -> PicklistPublicModel:
    row = PicklistPublicModel(name="Gender", slug="gender", is_active=True, is_deleted=False)
    picklist_value_sqlite_session.add(row)
    picklist_value_sqlite_session.commit()
    picklist_value_sqlite_session.refresh(row)
    return row


def _create_body(**extra: object) -> dict:
    body: dict = {
        "slug": "gender-male",
        "value": "male",
        "label": "Male",
        "description": "Male gender",
        "is_active": True,
        "is_default": True,
        "display_order": 1,
    }
    body.update(extra)
    return body


def test_picklist_value_crud_lifecycle(
    picklist_value_client: TestClient,
    seeded_picklist: PicklistPublicModel,
) -> None:
    pid = str(seeded_picklist.id)
    base = f"/api/v1/master-data/picklists/{pid}/values"

    created = picklist_value_client.post(base, json=_create_body())
    assert created.status_code == 201
    value_id = created.json()["data"]["id"]
    assert created.json()["data"]["is_default"] is True

    listed = picklist_value_client.get(base)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_id = picklist_value_client.get(f"{base}/{value_id}")
    assert by_id.status_code == 200

    by_slug = picklist_value_client.get(f"{base}/by-slug/gender-male")
    assert by_slug.status_code == 200

    updated = picklist_value_client.patch(
        f"{base}/{value_id}",
        json={"label": "Male (updated)", "display_order": 2},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["label"] == "Male (updated)"

    deactivated = picklist_value_client.delete(f"{base}/{value_id}")
    assert deactivated.status_code == 200
    assert deactivated.json()["data"]["is_active"] is False
    assert deactivated.json()["data"]["is_default"] is False

    active_only = picklist_value_client.get(f"{base}?is_active=true")
    assert active_only.status_code == 200
    assert active_only.json()["total"] == 0


def test_picklist_value_404_wrong_picklist(
    picklist_value_client: TestClient,
    seeded_picklist: PicklistPublicModel,
) -> None:
    response = picklist_value_client.post(
        f"/api/v1/master-data/picklists/{uuid4()}/values",
        json=_create_body(),
    )
    assert response.status_code == 404


def test_picklist_value_409_duplicate(
    picklist_value_client: TestClient,
    seeded_picklist: PicklistPublicModel,
) -> None:
    pid = str(seeded_picklist.id)
    base = f"/api/v1/master-data/picklists/{pid}/values"
    first = picklist_value_client.post(base, json=_create_body())
    assert first.status_code == 201
    second = picklist_value_client.post(
        base,
        json=_create_body(slug="gender-male-2", value="male"),
    )
    assert second.status_code == 409

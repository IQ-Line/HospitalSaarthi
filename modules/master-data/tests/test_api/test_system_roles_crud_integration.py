"""HTTP CRUD tests for system role template endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_session, get_system_role_repository
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.repositories.system_role_repository import SystemRoleRepository


@pytest.fixture()
def system_role_sqlite_session() -> Iterator[Session]:
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
def system_role_client(system_role_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()

    def _repo() -> SystemRoleRepository:
        return SystemRoleRepository(system_role_sqlite_session, CatalogScope(iq_tenant_id=None))

    def _session() -> Iterator[Session]:
        yield system_role_sqlite_session

    app.dependency_overrides[get_system_role_repository] = _repo
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _create_body(name: str, slug: str, **extra: object) -> dict:
    body: dict = {
        "name": name,
        "slug": slug,
        "description": "d",
        "is_template": True,
        "is_active": True,
    }
    body.update(extra)
    return body


def test_system_role_crud_lifecycle(system_role_client: TestClient) -> None:
    created = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Ward Clerk", "ward-clerk"),
    )
    assert created.status_code == 201
    rid = UUID(created.json()["data"]["id"])

    listed = system_role_client.get("/api/v1/master-data/system-roles")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_slug = system_role_client.get("/api/v1/master-data/system-roles/by-slug/ward-clerk")
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["name"] == "Ward Clerk"

    patched = system_role_client.patch(
        f"/api/v1/master-data/system-roles/{rid}",
        json={"description": "updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["description"] == "updated"

    deleted = system_role_client.delete(f"/api/v1/master-data/system-roles/{rid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert system_role_client.get(f"/api/v1/master-data/system-roles/{rid}").status_code == 404
    missing_slug = system_role_client.get(
        "/api/v1/master-data/system-roles/by-slug/ward-clerk",
    )
    assert missing_slug.status_code == 404


def test_system_role_slug_conflict_and_filter(system_role_client: TestClient) -> None:
    a = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role A", "same-slug"),
    )
    assert a.status_code == 201
    b = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role B", "same-slug"),
    )
    assert b.status_code == 409

    f = system_role_client.get("/api/v1/master-data/system-roles?is_template=true")
    assert f.status_code == 200
    assert f.json()["total"] == 1


def test_system_role_not_found_routes(system_role_client: TestClient) -> None:
    assert (
        system_role_client.get(f"/api/v1/master-data/system-roles/{uuid4()}").status_code == 404
    )
    assert (
        system_role_client.patch(
            f"/api/v1/master-data/system-roles/{uuid4()}",
            json={"name": "x"},
        ).status_code
        == 404
    )
    assert (
        system_role_client.delete(f"/api/v1/master-data/system-roles/{uuid4()}").status_code
        == 404
    )

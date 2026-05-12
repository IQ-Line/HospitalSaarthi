"""HTTP CRUD tests for permission catalog endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_permission_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.repositories.permission_repository import PermissionRepository


@pytest.fixture()
def permission_sqlite_session() -> Iterator[Session]:
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
def permission_client(permission_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()

    def _repo() -> PermissionRepository:
        return PermissionRepository(permission_sqlite_session, CatalogScope(tenant_id=None))

    def _session() -> Iterator[Session]:
        yield permission_sqlite_session

    app.dependency_overrides[get_permission_repository] = _repo
    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _create_json(name: str, slug: str, **extra: object) -> dict:
    body: dict = {
        "name": name,
        "slug": slug,
        "action": "read",
        "description": "d",
        "is_active": True,
    }
    body.update(extra)
    return body


def test_permission_crud_lifecycle(permission_client: TestClient) -> None:
    created = permission_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("perm_view", "perm-view"),
    )
    assert created.status_code == 201
    pid = UUID(created.json()["data"]["id"])

    listed = permission_client.get("/api/v1/master-data/permissions")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_slug = permission_client.get("/api/v1/master-data/permissions/by-slug/perm-view")
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["name"] == "perm_view"

    patched = permission_client.patch(
        f"/api/v1/master-data/permissions/{pid}",
        json={"action": "manage", "description": "new"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["action"] == "manage"

    deleted = permission_client.delete(f"/api/v1/master-data/permissions/{pid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert permission_client.get(f"/api/v1/master-data/permissions/{pid}").status_code == 404
    missing_slug = permission_client.get(
        "/api/v1/master-data/permissions/by-slug/perm-view"
    )
    assert missing_slug.status_code == 404


def test_permission_slug_conflict_and_filter(permission_client: TestClient) -> None:
    a = permission_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("a", "same", action="read"),
    )
    assert a.status_code == 201
    b = permission_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("b", "same", action="update"),
    )
    assert b.status_code == 409

    f = permission_client.get("/api/v1/master-data/permissions?action=read")
    assert f.status_code == 200
    assert f.json()["total"] == 1


def test_permission_not_found_routes(permission_client: TestClient) -> None:
    assert permission_client.get(f"/api/v1/master-data/permissions/{uuid4()}").status_code == 404
    assert permission_client.patch(
        f"/api/v1/master-data/permissions/{uuid4()}",
        json={"name": "x"},
    ).status_code == 404
    assert permission_client.delete(f"/api/v1/master-data/permissions/{uuid4()}").status_code == 404

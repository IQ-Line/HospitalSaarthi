"""HTTP CRUD tests for module_permissions junction endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import (
    get_module_permission_repository,
    get_module_repository,
    get_permission_repository,
    get_session,
)
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository


@pytest.fixture()
def mp_sqlite_session() -> Iterator[Session]:
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
def mp_client(mp_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()

    def _session() -> Iterator[Session]:
        yield mp_sqlite_session

    app.dependency_overrides[get_session] = _session
    scope = CatalogScope(tenant_id=None)
    app.dependency_overrides[get_module_repository] = lambda: ModuleRepository(
        mp_sqlite_session,
        scope,
    )
    app.dependency_overrides[get_permission_repository] = lambda: PermissionRepository(
        mp_sqlite_session,
        scope,
    )
    app.dependency_overrides[get_module_permission_repository] = (
        lambda: ModulePermissionRepository(mp_sqlite_session, scope)
    )

    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _post_module(client: TestClient, name: str, slug: str) -> UUID:
    r = client.post(
        "/api/v1/master-data/modules",
        json={
            "name": name,
            "slug": slug,
            "category": "clinical",
            "version": "1.0.0",
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    return UUID(r.json()["data"]["id"])


def _post_permission(client: TestClient, name: str, slug: str) -> UUID:
    r = client.post(
        "/api/v1/master-data/permissions",
        json={
            "name": name,
            "slug": slug,
            "action": "read",
            "description": "d",
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    return UUID(r.json()["data"]["id"])


def test_module_permission_crud_lifecycle(mp_client: TestClient) -> None:
    mid = _post_module(mp_client, "OPD", "opd-mod")
    pid = _post_permission(mp_client, "View", "opd-view")

    created = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "opd-mod--opd-view",
            "module_id": str(mid),
            "permission_id": str(pid),
            "is_default": True,
            "is_active": True,
        },
    )
    assert created.status_code == 201
    lid = UUID(created.json()["data"]["id"])

    listed = mp_client.get("/api/v1/master-data/module-permissions")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_mod = mp_client.get(f"/api/v1/master-data/module-permissions?module_id={mid}")
    assert by_mod.status_code == 200
    assert by_mod.json()["total"] == 1

    by_slug = mp_client.get("/api/v1/master-data/module-permissions/by-slug/opd-mod--opd-view")
    assert by_slug.status_code == 200

    patched = mp_client.patch(
        f"/api/v1/master-data/module-permissions/{lid}",
        json={"is_default": False},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["is_default"] is False

    deleted = mp_client.delete(f"/api/v1/master-data/module-permissions/{lid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert mp_client.get(f"/api/v1/master-data/module-permissions/{lid}").status_code == 404


def test_module_permission_duplicate_slug_and_pair(mp_client: TestClient) -> None:
    mid = _post_module(mp_client, "A", "mod-a")
    p1 = _post_permission(mp_client, "P1", "perm-one")
    p2 = _post_permission(mp_client, "P2", "perm-two")

    first = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "dup-slug",
            "module_id": str(mid),
            "permission_id": str(p1),
        },
    )
    assert first.status_code == 201

    dup_slug = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "dup-slug",
            "module_id": str(mid),
            "permission_id": str(p2),
        },
    )
    assert dup_slug.status_code == 409

    dup_pair = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "other-slug",
            "module_id": str(mid),
            "permission_id": str(p1),
        },
    )
    assert dup_pair.status_code == 409


def test_module_permission_list_pagination(mp_client: TestClient) -> None:
    mid = _post_module(mp_client, "Paginated", "paginated-mod")
    p1 = _post_permission(mp_client, "PA", "perm-a")
    p2 = _post_permission(mp_client, "PB", "perm-b")
    p3 = _post_permission(mp_client, "PC", "perm-c")

    for slug, pid in [
        ("paginated-mod--perm-a", p1),
        ("paginated-mod--perm-b", p2),
        ("paginated-mod--perm-c", p3),
    ]:
        r = mp_client.post(
            "/api/v1/master-data/module-permissions",
            json={
                "slug": slug,
                "module_id": str(mid),
                "permission_id": str(pid),
            },
        )
        assert r.status_code == 201, r.text

    page = mp_client.get("/api/v1/master-data/module-permissions?limit=2&offset=1")
    assert page.status_code == 200
    body = page.json()
    assert body["total"] == 3
    assert len(body["data"]) == 2


def test_module_permission_invalid_module_reference(mp_client: TestClient) -> None:
    pid = _post_permission(mp_client, "Px", "perm-x")
    bad = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "orphan-link",
            "module_id": str(uuid4()),
            "permission_id": str(pid),
        },
    )
    assert bad.status_code == 400
    assert "module" in bad.json()["error"]["message"].lower()


def test_module_permission_not_found(mp_client: TestClient) -> None:
    unknown = uuid4()
    assert mp_client.get(f"/api/v1/master-data/module-permissions/{unknown}").status_code == 404
    assert (
        mp_client.patch(
            f"/api/v1/master-data/module-permissions/{unknown}",
            json={"is_active": False},
        ).status_code
        == 404
    )
    assert (
        mp_client.delete(f"/api/v1/master-data/module-permissions/{unknown}").status_code == 404
    )


def test_module_permission_update_rejects_fk_repoint(mp_client: TestClient) -> None:
    mid = _post_module(mp_client, "Immutable", "immutable-mod")
    pid = _post_permission(mp_client, "ImmutableP", "immutable-perm")
    created = mp_client.post(
        "/api/v1/master-data/module-permissions",
        json={
            "slug": "immutable-link",
            "module_id": str(mid),
            "permission_id": str(pid),
        },
    )
    assert created.status_code == 201
    lid = UUID(created.json()["data"]["id"])

    rejected = mp_client.patch(
        f"/api/v1/master-data/module-permissions/{lid}",
        json={"module_id": str(uuid4())},
    )
    assert rejected.status_code == 422

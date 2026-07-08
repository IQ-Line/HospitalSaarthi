"""HTTP CRUD tests for permission catalog endpoints, against real Postgres/Citus."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient


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


def test_permission_crud_lifecycle(pg_client: TestClient) -> None:
    created = pg_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("perm_view", "perm-view"),
    )
    assert created.status_code == 201
    pid = UUID(created.json()["data"]["id"])

    listed = pg_client.get("/api/v1/master-data/permissions")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_slug = pg_client.get("/api/v1/master-data/permissions/by-slug/perm-view")
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["name"] == "perm_view"

    patched = pg_client.patch(
        f"/api/v1/master-data/permissions/{pid}",
        json={"action": "manage", "description": "new"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["action"] == "manage"

    deleted = pg_client.delete(f"/api/v1/master-data/permissions/{pid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert pg_client.get(f"/api/v1/master-data/permissions/{pid}").status_code == 404
    missing_slug = pg_client.get(
        "/api/v1/master-data/permissions/by-slug/perm-view"
    )
    assert missing_slug.status_code == 404


def test_permission_slug_conflict_and_filter(pg_client: TestClient) -> None:
    a = pg_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("a", "same", action="read"),
    )
    assert a.status_code == 201
    b = pg_client.post(
        "/api/v1/master-data/permissions",
        json=_create_json("b", "same", action="update"),
    )
    assert b.status_code == 409

    f = pg_client.get("/api/v1/master-data/permissions?action=read")
    assert f.status_code == 200
    assert f.json()["total"] == 1


def test_permission_not_found_routes(pg_client: TestClient) -> None:
    assert pg_client.get(f"/api/v1/master-data/permissions/{uuid4()}").status_code == 404
    assert pg_client.patch(
        f"/api/v1/master-data/permissions/{uuid4()}",
        json={"name": "x"},
    ).status_code == 404
    assert pg_client.delete(f"/api/v1/master-data/permissions/{uuid4()}").status_code == 404

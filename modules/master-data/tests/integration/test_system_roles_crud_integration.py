"""HTTP CRUD tests for system role template endpoints, against real Postgres/Citus."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient


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


def test_system_role_crud_lifecycle(pg_client: TestClient) -> None:
    created = pg_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Ward Clerk", "ward-clerk"),
    )
    assert created.status_code == 201
    rid = UUID(created.json()["data"]["id"])

    listed = pg_client.get("/api/v1/master-data/system-roles")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_slug = pg_client.get("/api/v1/master-data/system-roles/by-slug/ward-clerk")
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["name"] == "Ward Clerk"

    patched = pg_client.patch(
        f"/api/v1/master-data/system-roles/{rid}",
        json={"description": "updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["description"] == "updated"

    deleted = pg_client.delete(f"/api/v1/master-data/system-roles/{rid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert pg_client.get(f"/api/v1/master-data/system-roles/{rid}").status_code == 404
    missing_slug = pg_client.get(
        "/api/v1/master-data/system-roles/by-slug/ward-clerk",
    )
    assert missing_slug.status_code == 404


def test_system_role_slug_conflict_and_filter(pg_client: TestClient) -> None:
    a = pg_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role A", "same-slug"),
    )
    assert a.status_code == 201
    b = pg_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role B", "same-slug"),
    )
    assert b.status_code == 409

    f = pg_client.get("/api/v1/master-data/system-roles?is_template=true")
    assert f.status_code == 200
    assert f.json()["total"] == 1


def test_system_role_not_found_routes(pg_client: TestClient) -> None:
    assert (
        pg_client.get(f"/api/v1/master-data/system-roles/{uuid4()}").status_code == 404
    )
    assert (
        pg_client.patch(
            f"/api/v1/master-data/system-roles/{uuid4()}",
            json={"name": "x"},
        ).status_code
        == 404
    )
    assert (
        pg_client.delete(f"/api/v1/master-data/system-roles/{uuid4()}").status_code
        == 404
    )

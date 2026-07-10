"""HTTP CRUD tests for system_role_permissions junction endpoints, against real Postgres/Citus."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient


def _post_system_role(client: TestClient, name: str, slug: str) -> UUID:
    r = client.post(
        "/api/v1/master-data/system-roles",
        json={
            "name": name,
            "slug": slug,
            "description": "d",
            "is_template": True,
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


def test_system_role_permission_crud_lifecycle(pg_client: TestClient) -> None:
    rid = _post_system_role(pg_client, "Pharmacist", "pharmacist")
    pid = _post_permission(pg_client, "Dispense", "pharmacy-dispense")

    created = pg_client.post(
        "/api/v1/master-data/system-role-permissions",
        json={
            "slug": "pharmacist--pharmacy-dispense",
            "system_role_id": str(rid),
            "permission_id": str(pid),
            "is_default": True,
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    lid = UUID(created.json()["data"]["id"])

    listed = pg_client.get("/api/v1/master-data/system-role-permissions")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_role = pg_client.get(
        f"/api/v1/master-data/system-role-permissions?system_role_id={rid}",
    )
    assert by_role.status_code == 200
    assert by_role.json()["total"] == 1

    by_other_role = pg_client.get(
        f"/api/v1/master-data/system-role-permissions?system_role_id={uuid4()}",
    )
    assert by_other_role.status_code == 200
    assert by_other_role.json()["total"] == 0

    by_slug = pg_client.get(
        "/api/v1/master-data/system-role-permissions/by-slug/pharmacist--pharmacy-dispense",
    )
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["system_role_id"] == str(rid)

    patched = pg_client.patch(
        f"/api/v1/master-data/system-role-permissions/{lid}",
        json={"is_default": False},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["is_default"] is False

    deleted = pg_client.delete(f"/api/v1/master-data/system-role-permissions/{lid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert (
        pg_client.get(f"/api/v1/master-data/system-role-permissions/{lid}").status_code == 404
    )
    missing_slug = pg_client.get(
        "/api/v1/master-data/system-role-permissions/by-slug/pharmacist--pharmacy-dispense",
    )
    assert missing_slug.status_code == 404


def test_system_role_permission_duplicate_slug_and_pair(pg_client: TestClient) -> None:
    rid = _post_system_role(pg_client, "Clerk", "clerk")
    p1 = _post_permission(pg_client, "P1", "perm-one")
    p2 = _post_permission(pg_client, "P2", "perm-two")

    first = pg_client.post(
        "/api/v1/master-data/system-role-permissions",
        json={
            "slug": "dup-slug",
            "system_role_id": str(rid),
            "permission_id": str(p1),
        },
    )
    assert first.status_code == 201, first.text

    dup_slug = pg_client.post(
        "/api/v1/master-data/system-role-permissions",
        json={
            "slug": "dup-slug",
            "system_role_id": str(rid),
            "permission_id": str(p2),
        },
    )
    assert dup_slug.status_code == 409

    dup_pair = pg_client.post(
        "/api/v1/master-data/system-role-permissions",
        json={
            "slug": "other-slug",
            "system_role_id": str(rid),
            "permission_id": str(p1),
        },
    )
    assert dup_pair.status_code == 409


def test_system_role_permission_not_found(pg_client: TestClient) -> None:
    unknown = uuid4()
    assert (
        pg_client.get(f"/api/v1/master-data/system-role-permissions/{unknown}").status_code == 404
    )
    assert (
        pg_client.patch(
            f"/api/v1/master-data/system-role-permissions/{unknown}",
            json={"is_active": False},
        ).status_code
        == 404
    )
    assert (
        pg_client.delete(
            f"/api/v1/master-data/system-role-permissions/{unknown}",
        ).status_code
        == 404
    )

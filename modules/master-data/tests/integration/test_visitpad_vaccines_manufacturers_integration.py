"""HTTP CRUD for Visitpad vaccines + manufacturers (global and tenant header) on real Postgres."""

from __future__ import annotations

from fastapi.testclient import TestClient

TENANT_HDR = "00000000-0000-0000-0000-000000000007"


def test_visitpad_vaccine_global_crud(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/vaccines",
        json={
            "code": "VC_TEST",
            "display_name": "Test vaccine",
            "short_name": "tv",
            "display_order": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["code"] == "vc_test"
    assert body["iq_tenant_id"] is None
    vid = body["id"]

    r2 = pg_client.get(
        "/api/v1/master-data/visitpad/vaccines", params={"search": "VC_TEST"}
    )
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1

    r3 = pg_client.patch(
        f"/api/v1/master-data/visitpad/vaccines/{vid}",
        json={"display_name": "Test vaccine updated", "display_order": 2, "is_active": True},
    )
    assert r3.status_code == 200
    assert r3.json()["data"]["display_name"] == "Test vaccine updated"

    r4 = pg_client.delete(f"/api/v1/master-data/visitpad/vaccines/{vid}")
    assert r4.status_code == 200
    assert r4.json()["data"]["is_deleted"] is True


def test_visitpad_vaccine_tenant_scope_header(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/vaccines",
        headers={"iq_tenant_id": TENANT_HDR},
        json={
            "code": "tenant_vx",
            "display_name": "Tenant vaccine",
            "display_order": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["iq_tenant_id"] == TENANT_HDR


def test_visitpad_manufacturer_global_crud(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/manufacturers",
        json={
            "code": "mfr_test",
            "display_name": "Test Manufacturer",
            "display_order": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    mid = r.json()["data"]["id"]

    r2 = pg_client.delete(f"/api/v1/master-data/visitpad/manufacturers/{mid}")
    assert r2.status_code == 200

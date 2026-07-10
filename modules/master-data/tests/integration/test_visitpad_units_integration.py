"""HTTP CRUD for Visitpad units + conversions against real Postgres/Citus."""

from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient

TENANT_HDR = "00000000-0000-0000-0000-000000000007"


def test_iq_tenant_id_header_sets_tenant_scope(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        headers={"iq_tenant_id": TENANT_HDR},
        json={
            "code": "kg",
            "display_name": "Kilogram",
            "dimension": "mass",
            "is_canonical": True,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["iq_tenant_id"] == TENANT_HDR


def test_x_tenant_id_header_sets_tenant_scope(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        headers={"x-tenant-id": TENANT_HDR},
        json={
            "code": "lb",
            "display_name": "Pound",
            "dimension": "mass",
            "is_canonical": False,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["iq_tenant_id"] == TENANT_HDR


def test_visitpad_units_and_conversions_crud(pg_client: TestClient) -> None:
    r_kg = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        json={
            "code": "kg",
            "display_name": "Kilogram",
            "dimension": "mass",
            "is_canonical": True,
        },
    )
    assert r_kg.status_code == 201, r_kg.text
    assert r_kg.json()["data"]["iq_tenant_id"] is None

    r_g = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        json={"code": "g", "display_name": "Gram", "dimension": "mass"},
    )
    assert r_g.status_code == 201

    lst = pg_client.get("/api/v1/master-data/visitpad/units?limit=10&offset=0")
    assert lst.status_code == 200
    assert lst.json()["total"] == 2

    conv = pg_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={
            "from_unit_code": "kg",
            "to_unit_code": "g",
            "factor": 1000.0,
            "offset_value": 0.0,
        },
    )
    assert conv.status_code == 201, conv.text
    cid = UUID(conv.json()["data"]["id"])

    bad = pg_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={"from_unit_code": "kg", "to_unit_code": "kg", "factor": 1.0},
    )
    assert bad.status_code == 400

    g = pg_client.get(f"/api/v1/master-data/visitpad/unit-conversions/{cid}")
    assert g.status_code == 200
    assert g.json()["data"]["factor"] == 1000.0

    dup = pg_client.post(
        "/api/v1/master-data/visitpad/unit-conversions",
        json={"from_unit_code": "kg", "to_unit_code": "g", "factor": 2.0},
    )
    assert dup.status_code == 409

    dup_case = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        json={"code": "KG", "display_name": "Kilogram dup", "dimension": "mass"},
    )
    assert dup_case.status_code == 409

    patch_u = pg_client.patch(
        f"/api/v1/master-data/visitpad/units/{r_kg.json()['data']['id']}",
        json={"is_active": False},
    )
    assert patch_u.status_code == 409

    patch_factor_only = pg_client.patch(
        f"/api/v1/master-data/visitpad/unit-conversions/{cid}",
        json={"factor": 1000.5},
    )
    assert patch_factor_only.status_code == 200
    assert patch_factor_only.json()["data"]["factor"] == 1000.5

    del_conv = pg_client.delete(f"/api/v1/master-data/visitpad/unit-conversions/{cid}")
    assert del_conv.status_code == 200

    patch_u2 = pg_client.patch(
        f"/api/v1/master-data/visitpad/units/{r_kg.json()['data']['id']}",
        json={"is_active": False},
    )
    assert patch_u2.status_code == 200
    assert patch_u2.json()["data"]["is_active"] is False

    bad_revalidate = pg_client.patch(
        f"/api/v1/master-data/visitpad/unit-conversions/{cid}",
        json={"factor": 1.0},
    )
    assert bad_revalidate.status_code == 400


def test_bulk_import_units_from_platform(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        json={
            "code": "bulk_src",
            "display_name": "Bulk source unit",
            "dimension": "count",
            "display_order": 1,
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    pid = r.json()["data"]["id"]
    imp = pg_client.post(
        "/api/v1/master-data/visitpad/units/import-from-platform",
        headers={"iq_tenant_id": TENANT_HDR},
        json={"platform_row_ids": [pid]},
    )
    assert imp.status_code == 200, imp.text
    data = imp.json()["data"]
    assert len(data["created"]) == 1
    assert data["skipped"] == []
    assert data["errors"] == []
    lst = pg_client.get(
        "/api/v1/master-data/visitpad/units",
        headers={"iq_tenant_id": TENANT_HDR},
    )
    assert lst.status_code == 200
    assert lst.json()["total"] >= 1
    again = pg_client.post(
        "/api/v1/master-data/visitpad/units/import-from-platform",
        headers={"iq_tenant_id": TENANT_HDR},
        json={"platform_row_ids": [pid]},
    )
    assert again.status_code == 200
    skip_body = again.json()["data"]
    assert skip_body["created"] == []
    assert skip_body["skipped"] == [pid]


def test_bulk_import_units_requires_tenant_header(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/visitpad/units",
        json={
            "code": "pub_only",
            "display_name": "Public only",
            "dimension": "count",
        },
    )
    assert r.status_code == 201, r.text
    pid = r.json()["data"]["id"]
    bad = pg_client.post(
        "/api/v1/master-data/visitpad/units/import-from-platform",
        json={"platform_row_ids": [pid]},
    )
    assert bad.status_code == 400

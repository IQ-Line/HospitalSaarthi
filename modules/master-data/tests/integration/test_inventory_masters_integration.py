"""HTTP CRUD for inventory item types (global catalog), against real Postgres/Citus
via the shared ``pg_client`` (see conftest).
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_inventory_item_type_global_crud(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/inventory/item-types",
        json={"name": "Consumable", "is_active": True},
    )
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["name"] == "Consumable"
    assert body["iq_tenant_id"] is None
    row_id = body["id"]

    r2 = pg_client.get(
        "/api/v1/master-data/inventory/item-types",
        params={"search": "Consum"},
    )
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1

    r3 = pg_client.patch(
        f"/api/v1/master-data/inventory/item-types/{row_id}",
        json={"is_active": False},
    )
    assert r3.status_code == 200
    assert r3.json()["data"]["is_active"] is False

    r4 = pg_client.delete(f"/api/v1/master-data/inventory/item-types/{row_id}")
    assert r4.status_code == 200
    assert r4.json()["data"]["is_deleted"] is True


def test_inventory_uom_global_crud(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/inventory/uoms",
        json={"name": "Box", "abbreviation": "bx", "is_active": True},
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["abbreviation"] == "bx"


def test_inventory_store_type_auto_code(pg_client: TestClient) -> None:
    r = pg_client.post(
        "/api/v1/master-data/inventory/store-types",
        json={
            "name": "Main Pharmacy",
            "can_receive_stock": True,
            "can_dispense": True,
            "can_issue_to_ward": False,
            "track_batch_expiry": True,
            "indent_authority": False,
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["code"] == "ST-0001"

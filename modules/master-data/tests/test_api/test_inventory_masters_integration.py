"""HTTP CRUD for inventory item types (global catalog)."""

from __future__ import annotations

from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from hims_authz import Authz
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_session
from app.main import create_app
from app.models import Base


@pytest.fixture()
def inventory_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_tenant")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_global")

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
def inventory_api_client(
    inventory_sqlite_session: Session,
    test_authz: Authz,
    auth_headers: dict[str, str],
) -> Generator[TestClient, None, None]:
    app = create_app(deps={"authz": test_authz})

    def _session() -> Generator[Session, None, None]:
        yield inventory_sqlite_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app, headers=auth_headers) as client:
        yield client
    app.dependency_overrides.clear()


def test_inventory_item_type_global_crud(inventory_api_client: TestClient) -> None:
    r = inventory_api_client.post(
        "/api/v1/master-data/inventory/item-types",
        json={"name": "Consumable", "is_active": True},
    )
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["name"] == "Consumable"
    assert body["iq_tenant_id"] is None
    row_id = body["id"]

    r2 = inventory_api_client.get(
        "/api/v1/master-data/inventory/item-types",
        params={"search": "Consum"},
    )
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1

    r3 = inventory_api_client.patch(
        f"/api/v1/master-data/inventory/item-types/{row_id}",
        json={"is_active": False},
    )
    assert r3.status_code == 200
    assert r3.json()["data"]["is_active"] is False

    r4 = inventory_api_client.delete(f"/api/v1/master-data/inventory/item-types/{row_id}")
    assert r4.status_code == 200
    assert r4.json()["data"]["is_deleted"] is True


def test_inventory_uom_global_crud(inventory_api_client: TestClient) -> None:
    r = inventory_api_client.post(
        "/api/v1/master-data/inventory/uoms",
        json={"name": "Box", "abbreviation": "bx", "is_active": True},
    )
    assert r.status_code == 201, r.text
    assert r.json()["data"]["abbreviation"] == "bx"


def test_inventory_store_type_auto_code(inventory_api_client: TestClient) -> None:
    r = inventory_api_client.post(
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

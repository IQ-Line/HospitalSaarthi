"""HTTP CRUD for Visitpad vaccines + manufacturers (global and tenant header)."""

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

TENANT_HDR = "00000000-0000-0000-0000-000000000007"


@pytest.fixture()
def visitpad_sqlite_session() -> Iterator[Session]:
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
def visitpad_api_client(
    visitpad_sqlite_session: Session,
    test_authz: Authz,
    auth_headers: dict[str, str],
) -> Generator[TestClient, None, None]:
    app = create_app(deps={"authz": test_authz})

    def _session() -> Generator[Session, None, None]:
        yield visitpad_sqlite_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app, headers=auth_headers) as client:
        yield client
    app.dependency_overrides.clear()


def test_visitpad_vaccine_global_crud(visitpad_api_client: TestClient) -> None:
    r = visitpad_api_client.post(
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

    r2 = visitpad_api_client.get(
        "/api/v1/master-data/visitpad/vaccines", params={"search": "VC_TEST"}
    )
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1

    r3 = visitpad_api_client.patch(
        f"/api/v1/master-data/visitpad/vaccines/{vid}",
        json={"display_name": "Test vaccine updated", "display_order": 2, "is_active": True},
    )
    assert r3.status_code == 200
    assert r3.json()["data"]["display_name"] == "Test vaccine updated"

    r4 = visitpad_api_client.delete(f"/api/v1/master-data/visitpad/vaccines/{vid}")
    assert r4.status_code == 200
    assert r4.json()["data"]["is_deleted"] is True


def test_visitpad_vaccine_tenant_scope_header(visitpad_api_client: TestClient) -> None:
    r = visitpad_api_client.post(
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


def test_visitpad_manufacturer_global_crud(visitpad_api_client: TestClient) -> None:
    r = visitpad_api_client.post(
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

    r2 = visitpad_api_client.delete(f"/api/v1/master-data/visitpad/manufacturers/{mid}")
    assert r2.status_code == 200

"""Smoke tests for Visitpad catalog tables (Rx columns, medicines) on SQLite."""

from __future__ import annotations

from collections.abc import Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_session
from app.main import create_app
from app.models import Base


@pytest.fixture()
def visitpad_catalog_sqlite_session() -> Iterator[Session]:
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
def visitpad_catalog_client(
    visitpad_catalog_sqlite_session: Session,
) -> Generator[TestClient, None, None]:
    app = create_app()

    def _session() -> Generator[Session, None, None]:
        yield visitpad_catalog_sqlite_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_visitpad_rx_column_duplicate_returns_409(visitpad_catalog_client: TestClient) -> None:
    body = {
        "section": "frequency",
        "display_name": "Daily",
        "code": "qd",
        "display_order": 0,
        "is_active": True,
    }
    r1 = visitpad_catalog_client.post("/api/v1/master-data/visitpad/rx-columns", json=body)
    assert r1.status_code == 201, r1.text
    r2 = visitpad_catalog_client.post("/api/v1/master-data/visitpad/rx-columns", json=body)
    assert r2.status_code == 409, r2.text


def test_visitpad_medicine_create_and_get(visitpad_catalog_client: TestClient) -> None:
    body = {
        "code": "asp500tb",
        "display_name": "Aspirin 100mg",
        "generic_name": "Acetylsalicylic acid",
        "drug_class": "NSAID",
        "dosage_form": "tablet",
        "schedule": "otc",
        "price": 12.5,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/medicines", json=body)
    assert r.status_code == 201, r.text
    mid = r.json()["data"]["id"]
    g = visitpad_catalog_client.get(f"/api/v1/master-data/visitpad/medicines/{mid}")
    assert g.status_code == 200
    data = g.json()["data"]
    assert data["code"] == "asp500tb"
    assert data["price"] == 12.5

    lst = visitpad_catalog_client.get("/api/v1/master-data/visitpad/medicines")
    assert lst.status_code == 200
    codes = {row["code"]: row for row in lst.json()["data"]}
    assert codes["asp500tb"]["price"] == 12.5

    patch = visitpad_catalog_client.patch(
        f"/api/v1/master-data/visitpad/medicines/{mid}",
        json={"price": 15.0},
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["data"]["price"] == 15.0


def test_visitpad_chronic_illness_create_and_get(visitpad_catalog_client: TestClient) -> None:
    body = {
        "icd10_code": "dm2_t2",
        "display_name": "Type 2 Diabetes Mellitus",
        "category": "metabolic",
        "snomed_code": "44054006",
        "chronic_illness_prompt": True,
        "display_order": 0,
        "is_active": True,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/chronic-illnesses", json=body)
    assert r.status_code == 201, r.text
    cid = r.json()["data"]["id"]
    g = visitpad_catalog_client.get(f"/api/v1/master-data/visitpad/chronic-illnesses/{cid}")
    assert g.status_code == 200
    data = g.json()["data"]
    assert data["icd10_code"] == "dm2_t2"
    assert data["chronic_illness_prompt"] is True


def test_visitpad_procedure_create_and_get(visitpad_catalog_client: TestClient) -> None:
    body = {
        "cpt_code": "ecg_12",
        "short_name": "93000",
        "official_descriptor": "12-lead electrocardiogram",
        "display_name": "ECG 12-lead",
        "category": "diagnostic",
        "billing_category": "professional",
        "duration_minutes": 15,
        "requires_consent": True,
        "type_modality": "cardiology",
        "display_order": 0,
        "is_active": True,
        "snomed_code": "3457005",
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/procedures", json=body)
    assert r.status_code == 201, r.text
    pid = r.json()["data"]["id"]
    g = visitpad_catalog_client.get(f"/api/v1/master-data/visitpad/procedures/{pid}")
    assert g.status_code == 200
    data = g.json()["data"]
    assert data["cpt_code"] == "ecg_12"
    assert data["short_name"] == "93000"
    assert data["requires_consent"] is True
    assert data["snomed_code"] == "3457005"


TENANT_IMPORT = "00000000-0000-0000-0000-000000000007"


def test_visitpad_medicine_bulk_import_from_platform(visitpad_catalog_client: TestClient) -> None:
    body = {
        "code": "imp_med",
        "display_name": "Import Med",
        "generic_name": "Import Generic",
        "drug_class": "NSAID",
        "dosage_form": "tablet",
        "schedule": "otc",
        "price": 42.5,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/medicines", json=body)
    assert r.status_code == 201, r.text
    mid = r.json()["data"]["id"]
    assert r.json()["data"]["price"] == 42.5
    imp = visitpad_catalog_client.post(
        "/api/v1/master-data/visitpad/medicines/import-from-platform",
        headers={"iq_tenant_id": TENANT_IMPORT},
        json={"platform_row_ids": [mid]},
    )
    assert imp.status_code == 200, imp.text
    out = imp.json()["data"]
    assert len(out["created"]) == 1
    assert out["errors"] == []
    tenant_id = out["created"][0]
    g = visitpad_catalog_client.get(
        f"/api/v1/master-data/visitpad/medicines/{tenant_id}",
        headers={"iq_tenant_id": TENANT_IMPORT},
    )
    assert g.status_code == 200
    assert g.json()["data"]["price"] == 42.5


def test_visitpad_rx_column_bulk_import_from_platform(visitpad_catalog_client: TestClient) -> None:
    body = {
        "section": "frequency",
        "display_name": "Weekly",
        "code": "qw",
        "display_order": 0,
        "is_active": True,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/rx-columns", json=body)
    assert r.status_code == 201, r.text
    rid = r.json()["data"]["id"]
    imp = visitpad_catalog_client.post(
        "/api/v1/master-data/visitpad/rx-columns/import-from-platform?section=frequency",
        headers={"iq_tenant_id": TENANT_IMPORT},
        json={"platform_row_ids": [rid]},
    )
    assert imp.status_code == 200, imp.text
    out = imp.json()["data"]
    assert len(out["created"]) == 1
    wrong = visitpad_catalog_client.post(
        "/api/v1/master-data/visitpad/rx-columns/import-from-platform?section=route",
        headers={"iq_tenant_id": TENANT_IMPORT},
        json={"platform_row_ids": [rid]},
    )
    assert wrong.status_code == 200
    err = wrong.json()["data"]["errors"]
    assert len(err) == 1


def test_visitpad_vital_bulk_import_long_code_from_platform(
    visitpad_catalog_client: TestClient,
) -> None:
    body = {
        "code": "systolic_bp",
        "name": "Systolic BP",
        "short_name": "SBP",
        "category": "vital_signs",
        "data_type": "numeric",
        "unit": "mmHg",
        "default_unit_code": "mmhg",
        "display_order": 0,
        "is_active": True,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/vitals", json=body)
    assert r.status_code == 201, r.text
    vid = r.json()["data"]["id"]
    imp = visitpad_catalog_client.post(
        "/api/v1/master-data/visitpad/vitals/import-from-platform",
        headers={"iq_tenant_id": TENANT_IMPORT},
        json={"platform_row_ids": [vid]},
    )
    assert imp.status_code == 200, imp.text
    out = imp.json()["data"]
    assert len(out["created"]) == 1
    assert out["errors"] == []


def test_visitpad_import_rejects_inactive_platform_row(visitpad_catalog_client: TestClient) -> None:
    body = {
        "code": "inact_med",
        "display_name": "Inactive Med",
        "is_active": False,
    }
    r = visitpad_catalog_client.post("/api/v1/master-data/visitpad/medicines", json=body)
    assert r.status_code == 201, r.text
    mid = r.json()["data"]["id"]
    imp = visitpad_catalog_client.post(
        "/api/v1/master-data/visitpad/medicines/import-from-platform",
        headers={"iq_tenant_id": TENANT_IMPORT},
        json={"platform_row_ids": [mid]},
    )
    assert imp.status_code == 200, imp.text
    out = imp.json()["data"]
    assert out["created"] == []
    assert len(out["errors"]) == 1
    assert "inactive" in out["errors"][0]["message"].lower()

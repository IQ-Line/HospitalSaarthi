from __future__ import annotations

import uuid
from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from opd.core.database import get_db_session
from opd.main import create_app
from opd.models import Base

TENANT = "550e8400-e29b-41d4-a716-446655440000"
PATIENT = "660e8400-e29b-41d4-a716-446655440001"


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for table in Base.metadata.tables.values():
        table.schema = None
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app = create_app()
    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client


def _headers() -> dict[str, str]:
    return {"iq_tenant_id": TENANT}


def test_end_consultation_persists_vitals(client: TestClient) -> None:
    payload = {
        "form_data": {
            "vitals": {
                "systolic_bp": "120",
                "diastolic_bp": "80",
                "pulse_rate": "72",
            },
            "chiefComplaints": [
                {
                    "id": "1",
                    "complaint": "Fever",
                    "severity": "mild",
                    "duration": "2",
                    "durationUnit": "days",
                    "notes": "",
                }
            ],
        }
    }

    end = client.post(
        f"/api/v1/opd/patients/{PATIENT}/prescription/end",
        json=payload,
        headers=_headers(),
    )
    assert end.status_code == 200
    vitals = end.json()["form_data"]["vitals"]
    assert vitals["systolic_bp"] == "120"
    assert vitals["diastolic_bp"] == "80"
    assert vitals["pulse_rate"] == "72"

    visit_id = end.json()["visit_id"]
    by_visit = client.get(
        f"/api/v1/opd/visits/{visit_id}/prescription",
        headers=_headers(),
    )
    assert by_visit.status_code == 200
    assert by_visit.json()["form_data"]["vitals"]["systolic_bp"] == "120"


def test_visit_scoped_end_persists_vitals(client: TestClient) -> None:
    draft = client.put(
        f"/api/v1/opd/patients/{PATIENT}/prescription",
        json={"form_data": {"vitals": {}, "chiefComplaints": []}},
        headers=_headers(),
    )
    assert draft.status_code == 200
    visit_id = draft.json()["visit_id"]

    end = client.post(
        f"/api/v1/opd/visits/{visit_id}/prescription/end",
        json={
            "form_data": {
                "vitals": {"spo2": "98", "temperature": "37.2"},
                "chiefComplaints": [
                    {
                        "id": "1",
                        "complaint": "Cough",
                        "severity": "mild",
                        "duration": "1",
                        "durationUnit": "days",
                        "notes": "",
                    }
                ],
            }
        },
        headers=_headers(),
    )
    assert end.status_code == 200
    assert end.json()["form_data"]["vitals"]["spo2"] == "98"
    assert end.json()["form_data"]["chiefComplaints"][0]["complaint"] == "Cough"


def test_end_consultation_persists_form_data(client: TestClient) -> None:
    payload = {
        "form_data": {
            "vitals": {},
            "chiefComplaints": [
                {
                    "id": "1",
                    "complaint": "Fever",
                    "severity": "mild",
                    "duration": "2",
                    "durationUnit": "days",
                    "notes": "",
                }
            ],
        }
    }

    end = client.post(
        f"/api/v1/opd/patients/{PATIENT}/prescription/end",
        json=payload,
        headers=_headers(),
    )
    assert end.status_code == 200
    body = end.json()
    assert body["visit_status"] == "completed"
    assert body["is_read_only"] is True
    assert body["form_data"]["chiefComplaints"][0]["complaint"] == "Fever"

    loaded = client.get(f"/api/v1/opd/patients/{PATIENT}/prescription", headers=_headers())
    assert loaded.status_code == 200
    body = loaded.json()
    assert body["form_data"]["chiefComplaints"][0]["complaint"] == "Fever"
    assert body["prescription_id"]

    by_visit = client.get(
        f"/api/v1/opd/visits/{body['visit_id']}/prescription",
        headers=_headers(),
    )
    assert by_visit.status_code == 200
    assert by_visit.json()["prescription_id"] == body["prescription_id"]

    by_rx = client.get(
        f"/api/v1/opd/prescriptions/{body['prescription_id']}",
        headers=_headers(),
    )
    assert by_rx.status_code == 200
    assert by_rx.json()["visit_id"] == body["visit_id"]


def test_list_patients_returns_completed_encounter(client: TestClient) -> None:
    payload = {
        "form_data": {
            "vitals": {},
            "chiefComplaints": [
                {
                    "id": "1",
                    "complaint": "Fever",
                    "severity": "mild",
                    "duration": "2",
                    "durationUnit": "days",
                    "notes": "",
                }
            ],
        }
    }
    client.post(
        f"/api/v1/opd/patients/{PATIENT}/prescription/end",
        json=payload,
        headers=_headers(),
    )

    listed = client.get("/api/v1/opd/patients", headers=_headers())
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] >= 1
    row = next(item for item in body["items"] if item["patient_id"] == PATIENT)
    assert row["visit_status"] == "completed"
    assert row["prescription_status"] == "final"


def test_patient_prescription_skips_visit_without_prescription_row(
    client: TestClient,
) -> None:
    from opd.core.database import get_db_session
    from opd.models.prescription import Prescription
    from opd.models.visit import Visit

    tenant = uuid.UUID(TENANT)
    patient = uuid.UUID(PATIENT)
    now = datetime.now(UTC)
    earlier = now - timedelta(hours=1)

    db_gen = client.app.dependency_overrides[get_db_session]()
    db = next(db_gen)
    try:
        rx_visit = Visit(
            tenant_id=tenant,
            patient_id=patient,
            status="completed",
            created_at=earlier,
            updated_at=earlier,
        )
        db.add(rx_visit)
        db.flush()
        db.add(
            Prescription(
                tenant_id=tenant,
                visit_id=rx_visit.id,
                patient_id=patient,
                status="final",
                form_data={"chiefComplaints": [{"complaint": "Cough"}]},
                created_at=earlier,
                updated_at=earlier,
            )
        )

        empty_visit = Visit(
            tenant_id=tenant,
            patient_id=patient,
            status="in_progress",
            created_at=now,
            updated_at=now,
        )
        db.add(empty_visit)
        db.commit()
        rx_visit_id = rx_visit.id
    finally:
        db_gen.close()

    loaded = client.get(f"/api/v1/opd/patients/{PATIENT}/prescription", headers=_headers())
    assert loaded.status_code == 200
    assert loaded.json()["visit_id"] == str(rx_visit_id)


def test_nurse_pre_consult_sets_visit_status(client: TestClient) -> None:
    from opd.core.database import get_db_session
    from opd.models.visit import Visit

    tenant = uuid.UUID(TENANT)
    patient = uuid.UUID(PATIENT)
    now = datetime.now(UTC)

    db_gen = client.app.dependency_overrides[get_db_session]()
    db = next(db_gen)
    try:
        visit = Visit(
            tenant_id=tenant,
            patient_id=patient,
            status="registered",
            created_at=now,
            updated_at=now,
        )
        db.add(visit)
        db.commit()
        visit_id = visit.id
    finally:
        db_gen.close()

    payload = {
        "form_data": {
            "vitals": {"systolic_bp": "118", "diastolic_bp": "76"},
            "chiefComplaints": [],
            "immunizations": [],
        }
    }
    saved = client.put(
        f"/api/v1/opd/visits/{visit_id}/prescription/pre-consult",
        json=payload,
        headers=_headers(),
    )
    assert saved.status_code == 200
    body = saved.json()
    assert body["visit_status"] == "pre_consulted"
    assert body["form_data"]["vitals"]["systolic_bp"] == "118"


def test_get_patient_prescription_without_visit_row(client: TestClient) -> None:
    from opd.core.database import get_db_session
    from opd.models.prescription import Prescription

    tenant = uuid.UUID(TENANT)
    patient = uuid.UUID("770e8400-e29b-41d4-a716-446655440099")
    visit_key = uuid.uuid4()
    now = datetime.now(UTC)

    db_gen = client.app.dependency_overrides[get_db_session]()
    db = next(db_gen)
    try:
        db.add(
            Prescription(
                tenant_id=tenant,
                visit_id=visit_key,
                patient_id=patient,
                status="final",
                form_data={
                    "chiefComplaints": [
                        {
                            "id": "1",
                            "complaint": "Legacy cough",
                            "severity": "mild",
                            "duration": "2",
                            "durationUnit": "days",
                            "notes": "",
                        }
                    ]
                },
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()
    finally:
        db_gen.close()

    loaded = client.get(f"/api/v1/opd/patients/{patient}/prescription", headers=_headers())
    assert loaded.status_code == 200
    body = loaded.json()
    assert body["visit_status"] == "completed"
    assert body["form_data"]["chiefComplaints"][0]["complaint"] == "Legacy cough"

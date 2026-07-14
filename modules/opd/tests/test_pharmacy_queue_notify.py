from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import uuid4

from opd.lib.pharmacy_queue_notify import notify_pharmacy_queue_projection
from opd.lib import http_pharmacy_gateway
from opd.models.prescription_row import Prescription
from opd.models.registration_patient_snapshot import RegistrationPatientSnapshot
from opd.models.registration_visit import RegistrationVisit
from opd.models.visit import Visit


def test_notify_pharmacy_queue_projection_builds_payload(monkeypatch) -> None:
    calls: list[tuple[str, str, dict]] = []

    class FakeGateway:
        def upsert_queue_projection(self, tenant_id, visit_id, payload) -> None:
            calls.append((str(tenant_id), str(visit_id), payload))

    monkeypatch.setattr(http_pharmacy_gateway, "_gateway", FakeGateway())

    tenant_id = uuid4()
    visit_id = uuid4()
    patient_id = uuid4()
    doctor_id = uuid4()
    rx_id = uuid4()
    now = datetime.now(UTC)

    visit = Visit(
        id=visit_id,
        tenant_id=tenant_id,
        patient_id=patient_id,
        status="completed",
        created_at=now,
        updated_at=now,
    )
    rx = Prescription(
        id=rx_id,
        tenant_id=tenant_id,
        visit_id=visit_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        vitals_schema_version=1,
        status="final",
        form_data={"medicines": [{"id": "1", "medicine": "Paracetamol"}]},
        finalized_at=now,
        created_at=now,
        updated_at=now,
    )

    notify_pharmacy_queue_projection(tenant_id, visit, rx)

    assert len(calls) == 1
    _, called_visit_id, payload = calls[0]
    assert called_visit_id == str(visit_id)
    assert payload["prescription_status"] == "final"
    assert payload["visit_status"] == "completed"
    assert payload["medicine_count"] == 1


def test_notify_pharmacy_queue_projection_includes_registration_snapshot(
    monkeypatch,
    db_session,
) -> None:
    calls: list[tuple[str, str, dict]] = []

    class FakeGateway:
        def upsert_queue_projection(self, tenant_id, visit_id, payload) -> None:
            calls.append((str(tenant_id), str(visit_id), payload))

    monkeypatch.setattr(http_pharmacy_gateway, "_gateway", FakeGateway())

    tenant_id = uuid4()
    visit_id = uuid4()
    patient_id = uuid4()
    doctor_id = uuid4()
    rx_id = uuid4()
    now = datetime.now(UTC)

    db_session.add(
        RegistrationPatientSnapshot(
            tenant_id=tenant_id,
            registration_id=uuid4(),
            patient_id=patient_id,
            patient_uhid="UHID-PHARM",
            patient_full_name="Meera Shah",
            patient_phone_number="9810100010",
            patient_gender="female",
            patient_date_of_birth=date(1992, 3, 4),
            patient_year_of_birth=1992,
        )
    )
    db_session.add(
        RegistrationVisit(
            tenant_id=tenant_id,
            id=visit_id,
            formatted_visit_id="OP2606090000019",
            patient_id=patient_id,
            status="completed",
        )
    )
    db_session.flush()

    visit = Visit(
        id=visit_id,
        tenant_id=tenant_id,
        patient_id=patient_id,
        status="completed",
        created_at=now,
        updated_at=now,
    )
    rx = Prescription(
        id=rx_id,
        tenant_id=tenant_id,
        visit_id=visit_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        vitals_schema_version=1,
        status="final",
        form_data={"medicines": [{"medicine": "Tab A"}, {"medicine": "Tab B"}]},
        finalized_at=now,
        created_at=now,
        updated_at=now,
    )

    notify_pharmacy_queue_projection(tenant_id, visit, rx, session=db_session)

    assert len(calls) == 1
    payload = calls[0][2]
    assert payload["patient_name"] == "Meera Shah"
    assert payload["uhid"] == "UHID-PHARM"
    assert payload["phone"] == "9810100010"
    assert payload["gender"] == "female"
    assert payload["age_years"] is not None
    assert payload["formatted_visit_id"] == "OP2606090000019"


def test_notify_pharmacy_queue_projection_maps_final_rx_to_completed_visit(
    monkeypatch,
) -> None:
    calls: list[tuple[str, str, dict]] = []

    class FakeGateway:
        def upsert_queue_projection(self, tenant_id, visit_id, payload) -> None:
            calls.append((str(tenant_id), str(visit_id), payload))

    monkeypatch.setattr(http_pharmacy_gateway, "_gateway", FakeGateway())

    tenant_id = uuid4()
    visit_id = uuid4()
    patient_id = uuid4()
    doctor_id = uuid4()
    rx_id = uuid4()
    now = datetime.now(UTC)

    visit = Visit(
        id=visit_id,
        tenant_id=tenant_id,
        patient_id=patient_id,
        status="in_progress",
        created_at=now,
        updated_at=now,
    )
    rx = Prescription(
        id=rx_id,
        tenant_id=tenant_id,
        visit_id=visit_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        vitals_schema_version=1,
        status="final",
        form_data={"medicines": [{"medicine": "Dolo"}]},
        finalized_at=now,
        created_at=now,
        updated_at=now,
    )

    notify_pharmacy_queue_projection(tenant_id, visit, rx)

    assert calls[0][2]["visit_status"] == "completed"
    assert calls[0][2]["medicine_count"] == 1

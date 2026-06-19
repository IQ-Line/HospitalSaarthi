"""HTTP integration tests for prescription routes."""

from __future__ import annotations

from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from opd.lib import http_pharmacy_gateway
from opd.models.registration_patient_snapshot import RegistrationPatientSnapshot
from tests.conftest import PATIENT_ID, TENANT_A, make_create_payload

API_PREFIX = "/api/v1/opd/prescriptions"


def _tenant_q() -> dict[str, str]:
    return {"tenant_id": str(TENANT_A)}


def test_finalize_notifies_pharmacy_queue(
    prescription_client: TestClient,
    db_session,
    monkeypatch,
) -> None:
    calls: list[tuple[str, str, dict]] = []

    class FakeGateway:
        def upsert_queue_projection(self, tenant_id, visit_id, payload) -> None:
            calls.append((str(tenant_id), str(visit_id), payload))

    monkeypatch.setattr(http_pharmacy_gateway, "_gateway", FakeGateway())

    db_session.add(
        RegistrationPatientSnapshot(
            tenant_id=TENANT_A,
            registration_id=uuid4(),
            patient_id=PATIENT_ID,
            patient_uhid="UHID-FINALIZE",
            patient_full_name="Finalize Patient",
            patient_phone_number="9810100099",
            patient_gender="male",
            patient_date_of_birth=date(1988, 7, 20),
            patient_year_of_birth=1988,
        )
    )
    db_session.flush()

    visit_id = str(uuid4())
    create_body = make_create_payload(visit_id=visit_id)
    created = prescription_client.post(API_PREFIX, json=create_body)
    rx_id = created.json()["data"]["id"]

    finalized = prescription_client.post(
        f"{API_PREFIX}/{rx_id}/finalize",
        params=_tenant_q(),
        json={},
    )
    assert finalized.status_code == 200
    assert len(calls) == 1
    assert calls[0][1] == visit_id
    assert calls[0][2]["prescription_status"] == "final"
    assert calls[0][2]["visit_status"] == "completed"
    assert calls[0][2]["patient_name"] == "Finalize Patient"
    assert calls[0][2]["uhid"] == "UHID-FINALIZE"


def test_create_get_finalize_cancel_delete_flow(prescription_client: TestClient) -> None:
    visit_id = str(uuid4())
    create_body = make_create_payload(visit_id=visit_id)

    created = prescription_client.post(API_PREFIX, json=create_body)
    assert created.status_code == 201
    rx_id = created.json()["data"]["id"]
    assert created.json()["data"]["status"] == "draft"
    assert len(created.json()["data"]["status_history"]) == 1

    by_visit = prescription_client.get(f"{API_PREFIX}/by-visit/{visit_id}", params=_tenant_q())
    assert by_visit.status_code == 200
    assert by_visit.json()["data"]["id"] == rx_id
    assert by_visit.json()["data"]["visit_status"] is not None

    duplicate = prescription_client.post(API_PREFIX, json=create_body)
    assert duplicate.status_code == 409

    finalized = prescription_client.post(
        f"{API_PREFIX}/{rx_id}/finalize",
        params=_tenant_q(),
        json={},
    )
    assert finalized.status_code == 200
    assert finalized.json()["data"]["status"] == "final"
    assert any(
        h["to_status"] == "final" for h in finalized.json()["data"]["status_history"]
    )

    draft_visit = str(uuid4())
    draft = prescription_client.post(
        API_PREFIX,
        json=make_create_payload(visit_id=draft_visit),
    )
    draft_id = draft.json()["data"]["id"]
    cancelled = prescription_client.post(
        f"{API_PREFIX}/{draft_id}/cancel",
        params=_tenant_q(),
        json={"reason": "no show"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["data"]["status"] == "cancelled"

    deleted = prescription_client.delete(f"{API_PREFIX}/{rx_id}", params=_tenant_q())
    assert deleted.status_code == 204

    recreated = prescription_client.post(
        API_PREFIX,
        json=make_create_payload(visit_id=visit_id),
    )
    assert recreated.status_code == 201
    assert recreated.json()["data"]["id"] != rx_id


def test_batch_overlays_by_visit_ids(prescription_client: TestClient, db_session) -> None:
    from opd.models.visit import Visit

    visit_a_id = uuid4()
    visit_b_id = uuid4()
    visit_a = str(visit_a_id)
    visit_b = str(visit_b_id)
    missing_visit = str(uuid4())

    prescription_client.post(API_PREFIX, json=make_create_payload(visit_id=visit_a))
    prescription_client.post(API_PREFIX, json=make_create_payload(visit_id=visit_b))

    db_session.add(
        Visit(
            id=visit_a_id,
            tenant_id=TENANT_A,
            patient_id=uuid4(),
            status="pre_consulted",
        )
    )
    db_session.flush()

    response = prescription_client.get(
        f"{API_PREFIX}/by-visits",
        params={**_tenant_q(), "visit_ids": f"{visit_a},{visit_b},{missing_visit}"},
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert set(body.keys()) == {visit_a, visit_b}
    assert body[visit_a]["status"] == "draft"
    assert body[visit_a]["visit_status"] == "pre_consulted"
    assert body[visit_b]["visit_status"] is not None


def test_update_draft_only(prescription_client: TestClient) -> None:
    created = prescription_client.post(API_PREFIX, json=make_create_payload())
    rx_id = created.json()["data"]["id"]

    updated = prescription_client.put(
        f"{API_PREFIX}/{rx_id}",
        params=_tenant_q(),
        json={"clinical": {"symptoms": [{"line_no": 1, "symptom_text": "Fatigue"}]}},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["clinical"]["symptoms"][0]["symptom_text"] == "Fatigue"

    prescription_client.post(f"{API_PREFIX}/{rx_id}/finalize", params=_tenant_q(), json={})
    blocked = prescription_client.put(
        f"{API_PREFIX}/{rx_id}",
        params=_tenant_q(),
        json={"doctor_id": str(uuid4())},
    )
    assert blocked.status_code == 409

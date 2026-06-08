"""HTTP integration tests for prescription routes."""

from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TENANT_A, make_create_payload

API_PREFIX = "/api/v1/opd/prescriptions"


def _tenant_q() -> dict[str, str]:
    return {"tenant_id": str(TENANT_A)}


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

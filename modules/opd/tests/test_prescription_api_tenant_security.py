"""Edge-trust-boundary tests for the normalized /prescriptions routes.

These prove the tenant trust gap is closed: tenant_id is resolved from the
iq_tenant_id header (not query/body), the header is mandatory, and a caller
presenting tenant B's header can neither read nor mutate tenant A's rows.
"""

from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import PATIENT_ID, TENANT_A, TENANT_B, make_create_payload, tenant_headers

API_PREFIX = "/api/v1/opd/prescriptions"


def _create_for_tenant_a(client: TestClient, visit_id: str) -> str:
    created = client.post(
        API_PREFIX,
        json=make_create_payload(visit_id=visit_id),
        headers=tenant_headers(tenant_id=TENANT_A),
    )
    assert created.status_code == 201
    return created.json()["data"]["id"]


def test_cross_tenant_cannot_read_or_mutate(prescription_client: TestClient) -> None:
    """Tenant B presenting its own header must not see or change tenant A's prescription."""
    visit_id = str(uuid4())
    rx_id = _create_for_tenant_a(prescription_client, visit_id)

    headers_b = tenant_headers(tenant_id=TENANT_B)

    # Reads are scoped to tenant B -> tenant A's row is invisible (404 / absent).
    assert (
        prescription_client.get(
            f"{API_PREFIX}/by-visit/{visit_id}", headers=headers_b
        ).status_code
        == 404
    )
    assert (
        prescription_client.get(f"{API_PREFIX}/{rx_id}", headers=headers_b).status_code == 404
    )

    by_visits_b = prescription_client.get(
        f"{API_PREFIX}/by-visits",
        params={"visit_ids": visit_id},
        headers=headers_b,
    )
    assert by_visits_b.status_code == 200
    assert visit_id not in by_visits_b.json()["data"]

    list_b = prescription_client.get(
        API_PREFIX,
        params={"patient_id": str(PATIENT_ID)},
        headers=headers_b,
    )
    assert list_b.status_code == 200
    assert list_b.json()["total"] == 0
    assert list_b.json()["data"] == []

    # Mutations under tenant B must not touch tenant A's row -> 404.
    assert (
        prescription_client.put(
            f"{API_PREFIX}/{rx_id}",
            headers=headers_b,
            json={"clinical": {"symptoms": [{"line_no": 1, "symptom_text": "Hijack"}]}},
        ).status_code
        == 404
    )
    assert (
        prescription_client.post(
            f"{API_PREFIX}/{rx_id}/finalize", headers=headers_b, json={}
        ).status_code
        == 404
    )
    assert (
        prescription_client.post(
            f"{API_PREFIX}/{rx_id}/cancel", headers=headers_b, json={"reason": "x"}
        ).status_code
        == 404
    )
    assert (
        prescription_client.delete(f"{API_PREFIX}/{rx_id}", headers=headers_b).status_code == 404
    )

    # Tenant A still owns an untouched DRAFT after all of B's attempts.
    owner_view = prescription_client.get(
        f"{API_PREFIX}/{rx_id}", headers=tenant_headers(tenant_id=TENANT_A)
    )
    assert owner_view.status_code == 200
    assert owner_view.json()["data"]["status"] == "draft"
    assert owner_view.json()["data"]["clinical"]["symptoms"] == []


def test_create_without_tenant_header_returns_400(prescription_client: TestClient) -> None:
    response = prescription_client.post(API_PREFIX, json=make_create_payload())
    assert response.status_code == 400


def test_read_without_tenant_header_returns_400(prescription_client: TestClient) -> None:
    response = prescription_client.get(f"{API_PREFIX}/by-visit/{uuid4()}")
    assert response.status_code == 400


def test_invalid_tenant_header_returns_400(prescription_client: TestClient) -> None:
    response = prescription_client.post(
        API_PREFIX,
        json=make_create_payload(),
        headers={"iq_tenant_id": "not-a-uuid", "x-user-id": str(uuid4())},
    )
    assert response.status_code == 400

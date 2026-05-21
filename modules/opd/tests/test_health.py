"""Smoke test for the health endpoint.

Verifies the scaffold boots and the router is mounted before any domain code
is written. Replace/extend as endpoints are added.
"""

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/opd/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

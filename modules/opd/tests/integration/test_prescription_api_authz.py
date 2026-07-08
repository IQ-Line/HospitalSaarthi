"""In-process authz wiring: the identity gate (401) + per-route Cerbos guard (403).

Policy correctness (which capability grants which action) is covered by
infra/cerbos/tests/opd_permissions_test.yaml; these tests prove the opd-svc PEP is wired
end-to-end — an unauthenticated request is rejected, and a Cerbos DENY becomes a 403.
"""

from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from opd import create_app
from opd.http_handlers.deps import get_session
from tests.conftest import build_test_authz, make_create_payload, tenant_headers

API_PREFIX = "/api/v1/opd/prescriptions"


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/api/v1/opd/health").status_code == 200


def test_read_without_bearer_returns_401(prescription_client: TestClient) -> None:
    assert prescription_client.get(f"{API_PREFIX}/by-visit/{uuid4()}").status_code == 401


def test_valid_bearer_creates_prescription(prescription_client: TestClient) -> None:
    res = prescription_client.post(
        API_PREFIX, json=make_create_payload(), headers=tenant_headers()
    )
    assert res.status_code == 201


def test_cerbos_deny_returns_403(db_session: Session) -> None:
    app = create_app(deps={"authz": build_test_authz(allow=False)})

    def _session() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    with TestClient(app) as denied_client:
        res = denied_client.post(
            API_PREFIX, json=make_create_payload(), headers=tenant_headers()
        )
    app.dependency_overrides.clear()
    assert res.status_code == 403

"""Tests for HttpPharmacyGateway internal key header."""

from __future__ import annotations

from uuid import uuid4

from opd.lib import http_pharmacy_gateway
from opd.lib.http_pharmacy_gateway import PHARMACY_INTERNAL_KEY_HEADER


def test_upsert_queue_projection_sends_internal_key(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        status_code = 204

        def raise_for_status(self) -> None:
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def __enter__(self) -> FakeClient:
            return self

        def __exit__(self, *args) -> None:
            return None

        def put(self, url, json, headers) -> FakeResponse:
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return FakeResponse()

    monkeypatch.setenv("PHARMACY_URL", "http://localhost:3004")
    monkeypatch.setenv("PHARMACY_INTERNAL_API_KEY", "dev-internal-secret")
    monkeypatch.setattr(http_pharmacy_gateway.httpx, "Client", FakeClient)
    monkeypatch.setattr(http_pharmacy_gateway, "_gateway", None)

    tenant_id = uuid4()
    visit_id = uuid4()
    http_pharmacy_gateway.get_pharmacy_gateway().upsert_queue_projection(
        tenant_id,
        visit_id,
        {"patient_id": str(uuid4()), "prescription_status": "final"},
    )

    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers[PHARMACY_INTERNAL_KEY_HEADER] == "dev-internal-secret"

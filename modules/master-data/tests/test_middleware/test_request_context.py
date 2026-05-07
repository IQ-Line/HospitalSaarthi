"""Tests for ``RequestContextMiddleware`` inbound-read + echo behavior."""

from __future__ import annotations

import re

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.middleware.request_context import RequestContextMiddleware

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _minimal_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)

    @app.get("/state-id")
    def state_id(request: Request) -> dict[str, str]:
        return {"request_id": request.state.request_id}

    return app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(_minimal_app())


def test_reuses_inbound_x_request_id(client: TestClient) -> None:
    rid = "inbound-correlation-001"
    r = client.get("/state-id", headers={"X-Request-ID": rid})
    assert r.status_code == 200
    assert r.json()["request_id"] == rid
    assert r.headers.get("x-request-id") == rid


def test_generates_uuid_when_header_missing(client: TestClient) -> None:
    r = client.get("/state-id")
    assert r.status_code == 200
    body_id = r.json()["request_id"]
    header_id = r.headers.get("x-request-id")
    assert body_id == header_id
    assert _UUID_RE.match(body_id)


def test_invalid_header_falls_back_to_uuid(client: TestClient) -> None:
    r = client.get("/state-id", headers={"X-Request-ID": "bad\nid"})
    assert r.status_code == 200
    gen = r.json()["request_id"]
    assert _UUID_RE.match(gen)

    long_id = "x" * 300
    r2 = client.get("/state-id", headers={"X-Request-ID": long_id})
    assert _UUID_RE.match(r2.json()["request_id"])

"""Tests for ``RequestLoggingMiddleware`` (URL/headers/body in & out, redaction, skip paths)."""

from __future__ import annotations

import logging
import os
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.config import get_settings
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware


class Echo(BaseModel):
    name: str
    value: int


@pytest.fixture()
def configured_settings() -> Iterator[None]:
    """Enable body logging with a small cap to test truncation cleanly."""
    os.environ["MASTER_DATA_LOG_REQUEST_BODY"] = "true"
    os.environ["MASTER_DATA_LOG_RESPONSE_BODY"] = "true"
    os.environ["MASTER_DATA_LOG_MAX_BODY_BYTES"] = "32"
    os.environ["MASTER_DATA_LOG_SKIP_PATHS"] = "/skipme,/docs"
    get_settings.cache_clear()
    yield
    for k in (
        "MASTER_DATA_LOG_REQUEST_BODY",
        "MASTER_DATA_LOG_RESPONSE_BODY",
        "MASTER_DATA_LOG_MAX_BODY_BYTES",
        "MASTER_DATA_LOG_SKIP_PATHS",
    ):
        os.environ.pop(k, None)
    get_settings.cache_clear()


def _build_app() -> FastAPI:
    app = FastAPI()

    @app.post("/echo")
    def echo(payload: Echo) -> dict[str, object]:
        return {"received": payload.model_dump()}

    @app.get("/skipme")
    def skipme() -> dict[str, str]:
        return {"ok": "yes"}

    @app.get("/binary")
    def binary() -> JSONResponse:
        return JSONResponse(
            content=None,
            media_type="application/octet-stream",
        )

    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestContextMiddleware)
    return app


def _records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == "app.requests"]


def test_logs_request_and_response_with_redacted_headers(
    configured_settings: None, caplog: pytest.LogCaptureFixture
) -> None:
    app = _build_app()
    body = {"name": "x", "value": 1}

    with caplog.at_level(logging.INFO, logger="app.requests"):
        with TestClient(app) as tc:
            r = tc.post(
                "/echo",
                json=body,
                headers={
                    "Authorization": "Bearer super-secret-token",
                    "X-Request-ID": "req-123",
                },
            )

    assert r.status_code == 200

    recs = _records(caplog)
    assert len(recs) >= 2
    incoming, outgoing = recs[0], recs[1]

    assert incoming.message.startswith("--> POST /echo")
    assert incoming.method == "POST"
    assert incoming.path == "/echo"
    assert incoming.headers["authorization"] == "[REDACTED]"
    assert incoming.headers["x-request-id"] == "req-123"
    assert "\"name\":" in incoming.body and "\"value\":" in incoming.body
    assert incoming.request_id == "req-123"

    assert outgoing.message.startswith("<-- 200 POST /echo")
    assert outgoing.status == 200
    assert outgoing.duration_ms >= 0
    assert "\"received\":" in outgoing.body
    assert outgoing.request_id == "req-123"


def test_truncates_oversized_request_body(
    configured_settings: None, caplog: pytest.LogCaptureFixture
) -> None:
    app = _build_app()
    big_value = "y" * 200

    with caplog.at_level(logging.INFO, logger="app.requests"):
        with TestClient(app) as tc:
            r = tc.post("/echo", json={"name": big_value, "value": 1})

    assert r.status_code == 200
    incoming = _records(caplog)[0]
    assert "[truncated" in incoming.body


def test_skip_paths_emit_no_request_log(
    configured_settings: None, caplog: pytest.LogCaptureFixture
) -> None:
    app = _build_app()
    with caplog.at_level(logging.INFO, logger="app.requests"):
        with TestClient(app) as tc:
            r = tc.get("/skipme")

    assert r.status_code == 200
    assert _records(caplog) == []


def test_disable_request_body_logging(caplog: pytest.LogCaptureFixture) -> None:
    os.environ["MASTER_DATA_LOG_REQUEST_BODY"] = "false"
    os.environ["MASTER_DATA_LOG_RESPONSE_BODY"] = "false"
    get_settings.cache_clear()
    try:
        app = _build_app()
        with caplog.at_level(logging.INFO, logger="app.requests"):
            with TestClient(app) as tc:
                r = tc.post("/echo", json={"name": "x", "value": 1})
        assert r.status_code == 200
        incoming, outgoing = _records(caplog)[0], _records(caplog)[1]
        assert incoming.body == ""
        assert outgoing.body == ""
    finally:
        os.environ.pop("MASTER_DATA_LOG_REQUEST_BODY", None)
        os.environ.pop("MASTER_DATA_LOG_RESPONSE_BODY", None)
        get_settings.cache_clear()

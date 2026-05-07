"""Runs on every HTTP request: ``request.state.request_id`` and ``X-Request-ID`` header.

Reads inbound ``X-Request-ID`` when present and valid; otherwise generates a UUID,
and echoes it on the response so callers can correlate requests across services.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable

from starlette.types import ASGIApp, Message, Receive, Scope, Send

_REQUEST_ID_HEADER_LOWER = b"x-request-id"
# Reasonable upper bound (many gateways use 128 or 256)
_MAX_REQUEST_ID_LEN = 256


def _parse_headers(headers: Iterable[tuple[bytes, bytes]]) -> dict[bytes, bytes]:
    """Lowercase header names for lookup."""
    return {name.lower(): value for name, value in headers}


def _read_incoming_request_id(scope: Scope) -> str | None:
    raw = scope.get("headers") or []
    parsed = _parse_headers(raw)
    value = parsed.get(_REQUEST_ID_HEADER_LOWER)
    if value is None:
        return None
    try:
        text = value.decode("utf-8").strip()
    except UnicodeDecodeError:
        return None
    return text if text else None


def _is_valid_request_id(value: str | None) -> bool:
    if value is None or len(value) > _MAX_REQUEST_ID_LEN:
        return False
    # printable ASCII only (no newlines/control chars)
    for ch in value:
        if ord(ch) < 32 or ord(ch) > 126:
            return False
    return True


class RequestContextMiddleware:
    """Pure ASGI middleware for request id propagation."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = _read_incoming_request_id(scope)
        request_id = (
            incoming if _is_valid_request_id(incoming) else str(uuid.uuid4())
        )

        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("utf-8")))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_request_id)

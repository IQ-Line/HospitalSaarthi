"""Pure ASGI middleware that logs every HTTP request and response.

Logged fields per request (one INFO line in / one INFO line out):
    method, path, query, client, headers (redacted), body (truncated, decoded),
    status, duration_ms, response headers (redacted), response body (truncated).

Honors ``Settings.log_skip_paths`` (e.g. ``/docs``) and ``log_request_body`` /
``log_response_body`` toggles. Bodies past ``log_max_body_bytes`` are truncated
with a marker. ``Authorization``, ``Cookie`` and similar headers are redacted.

Sits inside ``RequestContextMiddleware`` so log records carry the bound
``request_id`` via the logging filter.
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Iterable

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import get_settings

logger = logging.getLogger("app.requests")

_REDACTED_HEADERS = frozenset(
    {
        "authorization",
        "proxy-authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "x-auth-token",
    }
)
_REDACTED_VALUE = "[REDACTED]"


def _decode_headers(headers: Iterable[tuple[bytes, bytes]]) -> dict[str, str]:
    out: dict[str, str] = {}
    for name, value in headers:
        try:
            n = name.decode("latin-1").lower()
            v = value.decode("latin-1")
        except UnicodeDecodeError:
            continue
        if n in _REDACTED_HEADERS:
            v = _REDACTED_VALUE
        # Multi-value headers (e.g. set-cookie) collapse into comma-joined value.
        out[n] = f"{out[n]}, {v}" if n in out else v
    return out


def _is_text_like(content_type: str | None) -> bool:
    if not content_type:
        return False
    ct = content_type.lower()
    return any(token in ct for token in ("json", "text", "xml", "form-urlencoded", "yaml"))


def _format_body(body: bytes, content_type: str | None, max_bytes: int) -> str:
    if not body:
        return ""
    if not _is_text_like(content_type):
        return f"<binary {len(body)} bytes>"
    truncated = len(body) > max_bytes
    snippet = body[:max_bytes]
    try:
        text = snippet.decode("utf-8", errors="replace")
    except Exception:  # pragma: no cover - decode("utf-8", errors="replace") shouldn't raise
        return f"<undecodable {len(body)} bytes>"
    return f"{text} ...[truncated {len(body)} bytes]" if truncated else text


def _normalize_skip_paths(raw: str) -> tuple[str, ...]:
    return tuple(p.strip() for p in raw.split(",") if p.strip())


def _format_headers(headers: dict[str, str]) -> str:
    if not headers:
        return "{}"
    return json.dumps(dict(sorted(headers.items())), ensure_ascii=False)


def _format_body_inline(body_text: str) -> str:
    return body_text if body_text else "(empty)"


def _should_skip(path: str, skip_paths: tuple[str, ...]) -> bool:
    return any(path == p or path.startswith(p + "/") for p in skip_paths)


async def _drain_request_body(
    receive: Receive, max_bytes: int
) -> tuple[bytes, bool, list[Message]]:
    """Consume ``http.request`` messages, returning captured prefix + raw chunks for replay."""
    captured = bytearray()
    truncated = False
    messages: list[Message] = []
    while True:
        msg = await receive()
        messages.append(msg)
        if msg["type"] != "http.request":
            break
        chunk = msg.get("body", b"")
        if chunk:
            remaining = max_bytes - len(captured)
            if remaining > 0:
                captured.extend(chunk[:remaining])
                if len(chunk) > remaining:
                    truncated = True
            else:
                truncated = True
        if not msg.get("more_body", False):
            break
    return bytes(captured), truncated, messages


def _make_replay_receive(messages: list[Message]) -> Receive:
    iterator = iter(messages)

    async def replay() -> Message:
        try:
            return next(iterator)
        except StopIteration:
            return {"type": "http.disconnect"}

    return replay


class RequestLoggingMiddleware:
    """Pure ASGI middleware: log incoming request and outgoing response with bodies."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        settings = get_settings()
        self._log_request_body = settings.log_request_body
        self._log_response_body = settings.log_response_body
        self._max_body_bytes = max(0, int(settings.log_max_body_bytes))
        self._skip_paths = _normalize_skip_paths(settings.log_skip_paths)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if _should_skip(path, self._skip_paths):
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        query = scope.get("query_string", b"").decode("latin-1")
        client = scope.get("client")
        client_str = f"{client[0]}:{client[1]}" if client else "-"

        request_headers = _decode_headers(scope.get("headers") or [])
        content_type = request_headers.get("content-type")

        request_body_text = ""
        replay_receive = receive
        if self._log_request_body and self._max_body_bytes > 0:
            captured, truncated, messages = await _drain_request_body(receive, self._max_body_bytes)
            replay_receive = _make_replay_receive(messages)
            request_body_text = _format_body(captured, content_type, self._max_body_bytes)
            if truncated and not request_body_text.endswith("bytes]"):
                request_body_text += " ...[truncated]"

        logger.info(
            "--> %s %s%s client=%s headers=%s body=%s",
            method,
            path,
            f"?{query}" if query else "",
            client_str,
            _format_headers(request_headers),
            _format_body_inline(request_body_text),
            extra={
                "method": method,
                "path": path,
                "query": query,
                "client": client_str,
                "headers": request_headers,
                "body": request_body_text,
            },
        )

        response_status = 0
        response_headers_raw: list[tuple[bytes, bytes]] = []
        response_body = bytearray()
        response_truncated = False
        capture_response = self._log_response_body and self._max_body_bytes > 0

        async def send_wrapper(message: Message) -> None:
            nonlocal response_status, response_headers_raw, response_truncated
            if message["type"] == "http.response.start":
                response_status = int(message.get("status", 0))
                response_headers_raw = list(message.get("headers", []))
            elif message["type"] == "http.response.body" and capture_response:
                chunk = message.get("body", b"")
                if chunk:
                    remaining = self._max_body_bytes - len(response_body)
                    if remaining > 0:
                        response_body.extend(chunk[:remaining])
                        if len(chunk) > remaining:
                            response_truncated = True
                    else:
                        response_truncated = True
            await send(message)

        started = time.perf_counter()
        try:
            await self.app(scope, replay_receive, send_wrapper)
        except Exception:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.exception(
                "<!! %s %s failed after %.2fms", method, path, duration_ms,
                extra={"method": method, "path": path, "duration_ms": duration_ms},
            )
            raise

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response_headers = _decode_headers(response_headers_raw)
        response_body_text = ""
        if capture_response:
            response_body_text = _format_body(
                bytes(response_body),
                response_headers.get("content-type"),
                self._max_body_bytes,
            )
            if response_truncated and not response_body_text.endswith("bytes]"):
                response_body_text += " ...[truncated]"

        logger.info(
            "<-- %d %s %s %.2fms headers=%s body=%s",
            response_status,
            method,
            path,
            duration_ms,
            _format_headers(response_headers),
            _format_body_inline(response_body_text),
            extra={
                "method": method,
                "path": path,
                "status": response_status,
                "duration_ms": duration_ms,
                "headers": response_headers,
                "body": response_body_text,
            },
        )

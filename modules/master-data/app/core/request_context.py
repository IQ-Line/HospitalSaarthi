"""Request-scoped correlation id via ContextVar (bound by RequestContextMiddleware)."""

from __future__ import annotations

from contextvars import ContextVar, Token

REQUEST_ID_HEADER = "x-request-id"

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    """Return the current HTTP request id, if inside a request handled by middleware."""
    return request_id_ctx.get()


def set_request_id(value: str) -> Token[str | None]:
    """Bind ``value`` for the current async context; returns token for ``reset_request_id``."""
    return request_id_ctx.set(value)


def reset_request_id(token: Token[str | None]) -> None:
    """Restore previous ContextVar state after the request completes."""
    request_id_ctx.reset(token)

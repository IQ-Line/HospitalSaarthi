"""Request-scoped hooks for bearer / identity (extension point for gateway JWT).

This stack position is reserved so **one** middleware can later validate
``Authorization``, attach ``request.state.principal`` (or similar), and skip
documentation paths. Today it only sets flags; it does **not** reject requests.

Registered from ``app.main`` alongside ``RequestContextMiddleware``.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# OpenAPI UI and schema must stay reachable without a bearer token.
_PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


class BearerAuthContextMiddleware(BaseHTTPMiddleware):
    """Prepares request state for bearer identity; does not enforce auth until wired to do so."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        request.state.public_path = any(
            path == p or path.startswith(p + "/") for p in _PUBLIC_PATH_PREFIXES
        )
        request.state.bearer_auth_enforced = False
        return await call_next(request)

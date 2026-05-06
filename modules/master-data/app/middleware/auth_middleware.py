"""Request-scoped hooks for bearer / identity (extension point for gateway JWT).

This stack position is reserved so **one** middleware can later validate
``Authorization``, attach ``request.state.principal`` (or similar), and skip
documentation paths. Today it only sets flags; it does **not** reject requests.

Registered from ``app.main`` alongside ``RequestContextMiddleware``.
"""

from __future__ import annotations

from starlette.types import ASGIApp, Receive, Scope, Send

# OpenAPI UI and schema must stay reachable without a bearer token.
_PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


class BearerAuthContextMiddleware:
    """Pure ASGI middleware; marks auth context without enforcing bearer checks."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        is_public = any(path == p or path.startswith(p + "/") for p in _PUBLIC_PATH_PREFIXES)
        scope.setdefault("state", {})
        scope["state"]["public_path"] = is_public
        scope["state"]["bearer_auth_enforced"] = False

        await self.app(scope, receive, send)

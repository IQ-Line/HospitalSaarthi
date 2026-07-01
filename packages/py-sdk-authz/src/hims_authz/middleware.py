"""Fail-closed identity gate (ASGI middleware).

Defense-in-depth for "close the direct-to-service bypass": guarantees that **every**
non-public request carries a JWT that verifies in-process, regardless of whether an
individual route remembered to attach an authorization guard. A missing or invalid token
is rejected with 401 before the handler runs.

This layer authenticates only — it does NOT authorize. Per-resource authorization is the
job of :meth:`Authz.require`. The verified identity is stashed on the request state so the
authorization dependency reuses it instead of verifying twice.
"""

from __future__ import annotations

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from hims_authz.dependency import _IDENTITY_STATE
from hims_authz.types import IdentityVerificationError
from hims_authz.verify import TokenVerifier

DEFAULT_PUBLIC_PATH_PREFIXES: tuple[str, ...] = ("/health",)


class IdentityGateMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        verifier: TokenVerifier,
        public_path_prefixes: tuple[str, ...] = DEFAULT_PUBLIC_PATH_PREFIXES,
    ) -> None:
        self.app = app
        self._verifier = verifier
        self._public = public_path_prefixes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope_type = scope["type"]
        if scope_type == "http":
            await self._handle_http(scope, receive, send)
            return
        if scope_type == "websocket":
            # This PEP gates HTTP; the services expose no authenticated WebSocket routes.
            # Deny WS handshakes on non-public paths (fail-closed) rather than forward them
            # unverified — otherwise the "every non-public request is verified" invariant leaks.
            if self._is_public(scope.get("path", "")):
                await self.app(scope, receive, send)
                return
            await self._reject_websocket(receive, send)
            return
        # lifespan / other non-request scopes: pass through.
        await self.app(scope, receive, send)

    async def _handle_http(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self._is_public(scope.get("path", "")):
            await self.app(scope, receive, send)
            return

        token = self._bearer(scope)
        if token is None:
            await self._unauthorized(scope, receive, send, "Missing bearer token")
            return
        try:
            identity = self._verifier.verify(token)
        except IdentityVerificationError as exc:
            await self._unauthorized(scope, receive, send, str(exc))
            return

        # Share the verified identity with the authorization dependency (same scope state).
        scope.setdefault("state", {})
        scope["state"][_IDENTITY_STATE] = identity
        await self.app(scope, receive, send)

    def _is_public(self, path: str) -> bool:
        # A path with dot-segments is never public — a public decision must be made on the
        # same canonical form the router resolves (defends against a fronting proxy or
        # sub-app that normalizes `..`/`.` after this check).
        if "/../" in path or "/./" in path or path.endswith(("/..", "/.")):
            return False
        # The trailing "/" is the boundary that stops `/healthz` from matching `/health`.
        return any(path == p or path.startswith(p + "/") for p in self._public)

    @staticmethod
    async def _reject_websocket(receive: Receive, send: Send) -> None:
        # Consume the connect event, then close the handshake with a policy-violation code.
        await receive()
        await send({"type": "websocket.close", "code": 1008})

    @staticmethod
    def _bearer(scope: Scope) -> str | None:
        for key, value in scope.get("headers", []):
            if key == b"authorization":
                raw = value.decode("latin-1")
                if raw.startswith("Bearer "):
                    token = raw[len("Bearer ") :].strip()
                    return token or None
                return None
        return None

    @staticmethod
    async def _unauthorized(
        scope: Scope, receive: Receive, send: Send, detail: str
    ) -> None:
        response = JSONResponse({"detail": detail}, status_code=401)
        await response(scope, receive, send)

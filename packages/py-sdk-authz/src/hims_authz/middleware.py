from __future__ import annotations

import logging
from uuid import UUID

import httpx
import jwt
from starlette.types import ASGIApp, Receive, Scope, Send

from hims_authz.types import EnrichedPrincipal

logger = logging.getLogger(__name__)

PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/health",
    "/meta",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


class BearerPrincipalMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        user_management_url: str,
        cerbos_url: str,
        jwt_secret: str | None = None,
        authz_enabled: bool = True,
    ) -> None:
        self.app = app
        self.user_management_url = user_management_url.rstrip("/")
        self.cerbos_url = cerbos_url
        self.jwt_secret = jwt_secret
        self.authz_enabled = authz_enabled

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "GET")
        is_public = any(path == p or path.startswith(p + "/") for p in PUBLIC_PATH_PREFIXES)

        scope.setdefault("state", {})
        scope["state"]["public_path"] = is_public
        scope["state"]["authz_enabled"] = self.authz_enabled
        scope["state"]["cerbos_url"] = self.cerbos_url

        if is_public or not self.authz_enabled:
            await self.app(scope, receive, send)
            return

        raw_token = self._extract_token(scope)
        principal = await self._resolve_principal(raw_token, path)
        if principal is None:
            principal = self._decode_jwt_fallback(raw_token)

        if principal is not None:
            scope["state"]["cerbos_principal"] = principal

        await self.app(scope, receive, send)

    def _extract_token(self, scope: Scope) -> str | None:
        headers = dict(scope.get("headers", []))
        raw = headers.get(b"authorization", b"").decode("utf-8", errors="replace")
        if raw.startswith("Bearer "):
            return raw[7:]
        return None

    async def _resolve_principal(self, token: str | None, path: str) -> EnrichedPrincipal | None:
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self.user_management_url}/auth/principal",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code != 200:
                    logger.warning(
                        "principal enrichment failed: status=%s path=%s",
                        resp.status_code,
                        path,
                    )
                    return None
                data = resp.json()
        except httpx.RequestError as exc:
            logger.warning("principal enrichment unreachable: %s path=%s", exc, path)
            return None

        attrs = data.get("attributes", {})
        return EnrichedPrincipal(
            id=data.get("id", ""),
            roles=data.get("roles", []),
            iq_tenant_id=attrs.get("iq_tenant_id", ""),
            capabilities=attrs.get("capabilities", []),
            delegated_capabilities=attrs.get("delegated_capabilities", []),
            role_codes=attrs.get("role_codes", []),
            department=attrs.get("department"),
            org_id=attrs.get("org_id"),
        )

    def _decode_jwt_fallback(self, token: str | None) -> EnrichedPrincipal | None:
        if not token:
            return None
        try:
            if self.jwt_secret:
                payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            else:
                payload = jwt.decode(token, options={"verify_signature": False})
        except jwt.PyJWTError:
            return None

        roles: list[str] = payload.get("roles") or []
        if isinstance(roles, str):
            roles = [roles]

        return EnrichedPrincipal(
            id=payload.get("sub", ""),
            roles=roles,
            iq_tenant_id=payload.get("iq_tenant_id", ""),
        )

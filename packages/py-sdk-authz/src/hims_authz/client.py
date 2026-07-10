"""Async Cerbos PDP wrapper.

Wraps the official ``cerbos`` SDK's ``AsyncCerbosClient`` (HTTP transport, :3592) so
FastAPI handlers can authorize without blocking the event loop. One client is created
per process and reused across requests (the underlying ``httpx.AsyncClient`` is safe for
concurrent use); it is closed on shutdown.

Fail-closed: the PDP returning DENY yields ``False`` (a 403 at the call site), and the PDP
being unreachable raises :class:`AuthorizationError` (also a deny) — an authorization
check must never fail open.
"""

from __future__ import annotations

import logging

from cerbos.sdk.client import AsyncCerbosClient
from cerbos.sdk.model import Principal, Resource

from hims_authz.types import AuthorizationError, CerbosPrincipal

logger = logging.getLogger(__name__)


class AuthzClient:
    """Per-resource Cerbos check for a :class:`CerbosPrincipal`."""

    def __init__(self, *, cerbos_http_url: str, timeout_seconds: float = 2.0) -> None:
        self._url = cerbos_http_url
        self._timeout = timeout_seconds
        self._client: AsyncCerbosClient | None = None

    def _get_client(self) -> AsyncCerbosClient:
        if self._client is None:
            # raise_on_error surfaces transport/5xx as exceptions (→ fail-closed);
            # a policy DENY is a normal 200 and returns False, not an exception.
            self._client = AsyncCerbosClient(
                host=self._url,
                timeout_secs=self._timeout,
                raise_on_error=True,
            )
        return self._client

    async def is_allowed(
        self,
        principal: CerbosPrincipal,
        kind: str,
        action: str,
        resource_id: str,
        resource_attr: dict[str, object],
    ) -> bool:
        cerbos_principal = Principal(
            principal.id,
            roles=list(principal.roles),
            attr=dict(principal.attr),
        )
        cerbos_resource = Resource(resource_id, kind, attr=dict(resource_attr))
        client = self._get_client()
        try:
            return await client.is_allowed(action, cerbos_principal, cerbos_resource)
        except Exception as exc:  # noqa: BLE001 — any PDP failure must fail closed (deny)
            logger.error(
                "cerbos check failed (fail-closed deny): kind=%s action=%s id=%s err=%s",
                kind, action, resource_id, exc,
            )
            raise AuthorizationError(f"authorization check failed: {exc}") from exc

    async def assert_reachable(self) -> None:
        """Startup probe — raise if the PDP cannot be reached.

        Transport failure is fatal at startup (mirrors ``cerbos-startup-probe.ts``); a
        DENY decision for the synthetic check is a healthy, reachable PDP.
        """
        client = self._get_client()
        probe_principal = Principal("__startup_probe__", roles=["__hims_authenticated__"])
        probe_resource = Resource("__startup_probe__", "__startup_probe__", attr={})
        try:
            await client.is_allowed("__probe__", probe_principal, probe_resource)
        except Exception as exc:  # noqa: BLE001 — startup reachability check
            raise AuthorizationError(f"cerbos PDP unreachable at {self._url}: {exc}") from exc

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

"""FastAPI integration — verify + enrich + authorize as dependencies.

Composes :class:`TokenVerifier`, :class:`PrincipalEnricher`, and :class:`AuthzClient` into
the FastAPI-canonical dependency-injection PEP (mirrors the Cerbos FastAPI tutorial):

    authz = Authz.from_settings(settings)

    @router.get("/prescriptions/{prescription_id}")
    async def read(prescription_id: str,
                   principal = Depends(authz.require("opd:prescription", "read"))):
        ...

Each ``require(...)`` dependency runs the full chain and **fails closed**: a missing/invalid
token → 401, an enrichment failure → 401, a Cerbos deny or PDP outage → 403. Identity +
principal are memoized on ``request.state`` so multiple guards on one request verify and
enrich only once.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request, status

from hims_authz.client import AuthzClient
from hims_authz.enrichment import PrincipalEnricher
from hims_authz.types import (
    AuthorizationError,
    AuthzSettings,
    CerbosPrincipal,
    IdentityVerificationError,
    PrincipalEnrichmentError,
    VerifiedIdentity,
)
from hims_authz.verify import TokenVerifier

_IDENTITY_STATE = "_hims_authz_identity"
_PRINCIPAL_STATE = "_hims_authz_principal"

ResourceIdResolver = str | Callable[[Request], str]
ResourceAttrResolver = (
    dict[str, object] | Callable[[Request, CerbosPrincipal], dict[str, object]]
)


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("authorization")
    if not header or not header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = header[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    return token


def _default_resource_id(request: Request) -> str:
    """Infer the resource id from path params (``*_id`` / ``id``); ``__new__`` for creates."""
    for name, value in request.path_params.items():
        if (name == "id" or name.endswith("_id")) and isinstance(value, str) and value:
            return value
    return "__new__"


class Authz:
    """Holds the PEP components and exposes FastAPI dependencies."""

    def __init__(
        self,
        *,
        verifier: TokenVerifier,
        enricher: PrincipalEnricher,
        client: AuthzClient,
    ) -> None:
        self._verifier = verifier
        self._enricher = enricher
        self._client = client

    @classmethod
    def from_settings(cls, settings: AuthzSettings) -> Authz:
        verifier = TokenVerifier(
            jwks_url=settings.jwks_url,
            issuer=settings.issuer,
            audience=settings.audience,
            max_token_age_seconds=settings.max_token_age_seconds,
            clock_skew_seconds=settings.clock_skew_seconds,
        )
        enricher = PrincipalEnricher(
            principal_url=settings.principal_url,
            cache_ttl_seconds=settings.enrichment_cache_ttl_seconds,
            http_timeout_seconds=settings.http_timeout_seconds,
        )
        client = AuthzClient(
            cerbos_http_url=settings.cerbos_http_url,
            timeout_seconds=settings.cerbos_timeout_seconds,
        )
        return cls(verifier=verifier, enricher=enricher, client=client)

    @property
    def verifier(self) -> TokenVerifier:
        """The token verifier — share it with :class:`IdentityGateMiddleware`."""
        return self._verifier

    async def get_identity(self, request: Request) -> VerifiedIdentity:
        cached = getattr(request.state, _IDENTITY_STATE, None)
        if isinstance(cached, VerifiedIdentity):
            return cached
        token = _extract_bearer(request)
        try:
            identity = self._verifier.verify(token)
        except IdentityVerificationError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
            ) from exc
        setattr(request.state, _IDENTITY_STATE, identity)
        return identity

    async def get_principal(self, request: Request) -> CerbosPrincipal:
        cached = getattr(request.state, _PRINCIPAL_STATE, None)
        if isinstance(cached, CerbosPrincipal):
            return cached
        identity = await self.get_identity(request)
        token = _extract_bearer(request)
        try:
            principal = await self._enricher.enrich(token, identity)
        except PrincipalEnrichmentError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
            ) from exc
        setattr(request.state, _PRINCIPAL_STATE, principal)
        return principal

    async def authorize(
        self,
        request: Request,
        kind: str,
        action: str,
        *,
        resource_id: ResourceIdResolver | None = None,
        resource_attr: ResourceAttrResolver | None = None,
    ) -> CerbosPrincipal:
        """Verify + enrich + Cerbos-check ``action`` on ``kind``; raise 401/403 on failure.

        The reusable core behind :meth:`require`; a table-driven guard can call it directly.
        """
        principal = await self.get_principal(request)
        rid = self._resolve_resource_id(request, resource_id)
        attr = self._resolve_resource_attr(request, principal, resource_attr)
        try:
            allowed = await self._client.is_allowed(principal, kind, action, rid, attr)
        except AuthorizationError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            ) from exc
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return principal

    def require(
        self,
        kind: str,
        action: str,
        *,
        resource_id: ResourceIdResolver | None = None,
        resource_attr: ResourceAttrResolver | None = None,
    ) -> Callable[[Request], Awaitable[CerbosPrincipal]]:
        """Return a dependency that authorizes ``action`` on ``kind`` and yields the principal."""

        async def _dependency(request: Request) -> CerbosPrincipal:
            return await self.authorize(
                request, kind, action, resource_id=resource_id, resource_attr=resource_attr
            )

        return _dependency

    @staticmethod
    def _resolve_resource_id(
        request: Request, resolver: ResourceIdResolver | None
    ) -> str:
        if resolver is None:
            return _default_resource_id(request)
        if callable(resolver):
            return resolver(request)
        return resolver

    @staticmethod
    def _resolve_resource_attr(
        request: Request,
        principal: CerbosPrincipal,
        resolver: ResourceAttrResolver | None,
    ) -> dict[str, object]:
        if resolver is None:
            # Default: a tenant-scoped resource in the caller's own tenant. Policies pair
            # this tenant-isolation check with a capability gate; services with global or
            # cross-tenant resources pass an explicit resolver.
            return {"iq_tenant_id": principal.attr.get("iq_tenant_id", "")}
        if callable(resolver):
            return resolver(request, principal)
        return dict(resolver)

    async def assert_reachable(self) -> None:
        await self._client.assert_reachable()

    async def aclose(self) -> None:
        await self._enricher.aclose()
        await self._client.aclose()

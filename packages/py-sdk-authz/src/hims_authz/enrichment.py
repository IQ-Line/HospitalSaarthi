"""Principal enrichment — resolve the caller's Cerbos principal from User Management.

The access JWT carries identity (``sub``, ``iq_tenant_id``, ``roles``) but NOT the
authorization attributes Cerbos policies gate on (``capabilities``,
``delegated_capabilities``, ``clearances``, ...). Rather than re-implement User
Management's capability materialization in Python (the "reinvent it worse" trap in a
polyglot monorepo), the PEP forwards the verified bearer to UM
``GET /auth/principal`` — which returns the exact enriched payload UM already builds for
its own Cerbos checks — and maps it to a :class:`CerbosPrincipal`.

Design invariants:
- **Fail-closed.** Any enrichment failure (UM unreachable, non-200, bad body, identity
  mismatch) raises :class:`PrincipalEnrichmentError`. No capabilities ⇒ no authorization.
- **Short-TTL cache keyed by ``jti``.** A token's principal is stable for the token's
  (short) lifetime, so caching by ``jti`` collapses repeated per-request UM round-trips
  without staleness risk. The GET is idempotent, so a cache race merely double-fetches.
- **Identity cross-check.** The enriched principal's ``id``/``iq_tenant_id`` must match the
  verified token's ``sub``/``iq_tenant_id``; a mismatch is a cross-tenant/confused-deputy
  anomaly and is rejected.

The ``id``/``roles``/``attr`` construction mirrors ``buildCerbosPrincipalWire`` from
``@hims/ts-sdk-authz`` so the Cerbos wire object is identical across languages.
"""

from __future__ import annotations

import time
from collections.abc import Callable

import httpx

from hims_authz.types import (
    CerbosPrincipal,
    PrincipalEnrichmentError,
    VerifiedIdentity,
)

CERBOS_ROLELESS_FALLBACK_ROLE = "__hims_authenticated__"


def _merge_role_codes(identity_roles: tuple[str, ...], snapshot_roles: object) -> list[str]:
    """Union of identity + snapshot roles, trimmed/lowercased/deduped/sorted.

    Mirrors ``mergeRoleCodes`` in ``@hims/ts-sdk-authz`` ``principal-wire.ts``.
    """
    merged: set[str] = set()
    # A non-list snapshot `roles` is coerced to empty (more conservative than the TS
    # snapshot-reject-and-fall-back-to-identity path); the authoritative role_codes still
    # come from the validated `attributes` in `_build`.
    raw_snapshot = snapshot_roles if isinstance(snapshot_roles, list) else []
    for raw in [*identity_roles, *raw_snapshot]:
        if isinstance(raw, str) and raw.strip():
            merged.add(raw.strip().lower())
    return sorted(merged)


class PrincipalEnricher:
    """Resolves a :class:`CerbosPrincipal` from UM ``GET /auth/principal``.

    Construct once per process and reuse (holds the HTTP client + cache).
    """

    def __init__(
        self,
        *,
        principal_url: str,
        cache_ttl_seconds: float = 30.0,
        http_timeout_seconds: float = 5.0,
        http_client: httpx.AsyncClient | None = None,
        clock: Callable[[], float] = time.monotonic,
        max_cache_entries: int = 10_000,
    ) -> None:
        self._url = principal_url
        self._ttl = cache_ttl_seconds
        self._timeout = http_timeout_seconds
        self._clock = clock
        self._max_cache_entries = max_cache_entries
        self._client = http_client
        self._owns_client = http_client is None
        self._cache: dict[tuple[str, str], tuple[float, CerbosPrincipal]] = {}

    async def enrich(self, token: str, identity: VerifiedIdentity) -> CerbosPrincipal:
        # Key on (subject, jti), not jti alone: even under a (spec-negligible) jti
        # collision across subjects, one subject's principal can never be served to another.
        key = (identity.user_id, identity.jti)
        cached = self._cache_get(key)
        if cached is not None:
            return cached
        snapshot = await self._fetch(token)
        principal = self._build(identity, snapshot)
        self._cache_put(key, principal)
        return principal

    async def aclose(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None

    # -- internals -----------------------------------------------------------------

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout)
        return self._client

    async def _fetch(self, token: str) -> dict[str, object]:
        client = self._get_client()
        try:
            resp = await client.get(
                self._url, headers={"Authorization": f"Bearer {token}"}
            )
        except httpx.HTTPError as exc:
            raise PrincipalEnrichmentError(f"enrichment request failed: {exc}") from exc
        if resp.status_code != 200:
            raise PrincipalEnrichmentError(
                f"enrichment returned status {resp.status_code}"
            )
        try:
            data = resp.json()
        except ValueError as exc:
            raise PrincipalEnrichmentError("enrichment returned invalid JSON") from exc
        if not isinstance(data, dict):
            raise PrincipalEnrichmentError("enrichment payload is not an object")
        return data

    def _build(
        self, identity: VerifiedIdentity, snapshot: dict[str, object]
    ) -> CerbosPrincipal:
        principal_id = snapshot.get("id")
        attributes = snapshot.get("attributes")
        if not isinstance(principal_id, str) or not principal_id:
            raise PrincipalEnrichmentError("enrichment payload missing id")
        if not isinstance(attributes, dict):
            raise PrincipalEnrichmentError("enrichment payload missing attributes")

        # Cross-check: UM must have resolved the same subject/tenant the token proves.
        if principal_id != identity.user_id:
            raise PrincipalEnrichmentError(
                "enriched principal id does not match verified subject"
            )
        attr_tenant = attributes.get("iq_tenant_id")
        if attr_tenant != identity.tenant_id:
            raise PrincipalEnrichmentError(
                "enriched principal tenant does not match verified tenant"
            )

        merged_roles = _merge_role_codes(identity.roles, snapshot.get("roles"))
        attr = {**attributes, "role_codes": merged_roles}
        roles = tuple(merged_roles) if merged_roles else (CERBOS_ROLELESS_FALLBACK_ROLE,)
        return CerbosPrincipal(id=principal_id, roles=roles, attr=attr)

    def _cache_get(self, key: tuple[str, str]) -> CerbosPrincipal | None:
        entry = self._cache.get(key)
        if entry is None:
            return None
        expires_at, principal = entry
        if self._clock() >= expires_at:
            self._cache.pop(key, None)
            return None
        return principal

    def _cache_put(self, key: tuple[str, str], principal: CerbosPrincipal) -> None:
        now = self._clock()
        if len(self._cache) >= self._max_cache_entries:
            # Cheap bound: drop entries that have already expired; if none have, clear all.
            expired = [k for k, (exp, _) in self._cache.items() if now >= exp]
            for k in expired:
                self._cache.pop(k, None)
            if len(self._cache) >= self._max_cache_entries:
                self._cache.clear()
        self._cache[key] = (now + self._ttl, principal)

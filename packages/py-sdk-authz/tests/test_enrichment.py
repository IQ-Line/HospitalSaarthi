"""Enrichment tests — HTTP-first principal resolution, fail-closed, cached, cross-checked."""

from __future__ import annotations

import httpx
import pytest

from hims_authz.enrichment import PrincipalEnricher
from hims_authz.types import (
    CerbosPrincipal,
    PrincipalEnrichmentError,
    VerifiedIdentity,
)

SUB = "11111111-1111-4111-8111-111111111111"
URL = "http://user-management/api/user-management/auth/principal"


def _identity(
    *, jti: str = "jti-1", roles: tuple[str, ...] = ("doctor",),
    sub: str = SUB, tenant: str = "tenant-a",
) -> VerifiedIdentity:
    return VerifiedIdentity(
        user_id=sub, tenant_id=tenant, org_id="", roles=roles,
        department=None, session_id="", jti=jti, iat=0, exp=0, iss="iss",
    )


def _payload(**attr_overrides: object) -> dict:
    attributes = {
        "iq_tenant_id": "tenant-a",
        "department": None,
        "org_id": None,
        "role_codes": ["doctor"],
        "capabilities": ["opd:prescription:read"],
        "delegated_capabilities": [],
        "clearances": {},
        "um_clearance_effective_tier": 0,
    }
    attributes.update(attr_overrides)
    return {"id": SUB, "roles": ["doctor"], "attributes": attributes}


def _enricher(handler, **kwargs) -> PrincipalEnricher:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return PrincipalEnricher(principal_url=URL, http_client=client, **kwargs)


async def test_valid_enrichment_builds_cerbos_principal() -> None:
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization", "")
        return httpx.Response(200, json=_payload())

    enricher = _enricher(handler)
    principal = await enricher.enrich("tok-123", _identity())

    assert seen["auth"] == "Bearer tok-123"  # verified bearer forwarded S2S
    assert isinstance(principal, CerbosPrincipal)
    assert principal.id == SUB
    assert principal.roles == ("doctor",)
    # ALL policy-read attr keys must survive into the Cerbos principal, not just a few —
    # a refactor that drops delegated_capabilities/clearances/tier would break policy eval.
    assert principal.attr == {
        "iq_tenant_id": "tenant-a",
        "department": None,
        "org_id": None,
        "role_codes": ["doctor"],
        "capabilities": ["opd:prescription:read"],
        "delegated_capabilities": [],
        "clearances": {},
        "um_clearance_effective_tier": 0,
    }


async def test_roles_merged_from_identity_and_snapshot() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        # snapshot carries role "doctor"; the identity below carries "nurse"
        return httpx.Response(200, json=_payload())

    enricher = _enricher(handler)
    principal = await enricher.enrich("t", _identity(roles=("nurse",)))
    # union of identity {nurse} and snapshot {doctor}, trimmed/lowercased/sorted
    assert principal.roles == ("doctor", "nurse")
    assert principal.attr["role_codes"] == ["doctor", "nurse"]


async def test_roleless_principal_gets_authenticated_fallback() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        payload = _payload(role_codes=[])
        payload["roles"] = []
        return httpx.Response(200, json=payload)

    enricher = _enricher(handler)
    principal = await enricher.enrich("t", _identity(roles=()))
    assert principal.roles == ("__hims_authenticated__",)
    assert principal.attr["role_codes"] == []


async def test_non_200_fails_closed() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "nope"})

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_transport_error_fails_closed() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("pdp down")

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_id_mismatch_is_rejected() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        payload = _payload()
        payload["id"] = "22222222-2222-4222-8222-222222222222"
        return httpx.Response(200, json=payload)

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_tenant_mismatch_is_rejected() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_payload(iq_tenant_id="tenant-EVIL"))

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_missing_attributes_is_rejected() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": SUB, "roles": ["doctor"]})

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_invalid_json_body_fails_closed() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, content=b"not json", headers={"content-type": "application/json"}
        )

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_non_object_body_fails_closed() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=["not", "an", "object"])

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_empty_id_is_rejected() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        payload = _payload()
        payload["id"] = ""
        return httpx.Response(200, json=payload)

    enricher = _enricher(handler)
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity())


async def test_cache_avoids_second_round_trip() -> None:
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_payload())

    enricher = _enricher(handler)
    identity = _identity(jti="jti-cache")
    first = await enricher.enrich("t", identity)
    second = await enricher.enrich("t", identity)
    assert calls["n"] == 1
    assert first == second


async def test_cache_is_not_shared_across_subjects_with_same_jti() -> None:
    # A cache keyed on jti alone would serve subject A's principal to a same-jti subject B.
    # With the (subject, jti) key, B misses the cache, re-fetches, and the id cross-check
    # rejects the SUB-owned payload — so B can never inherit A's authorization.
    calls = {"n": 0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_payload())  # payload id == SUB

    enricher = _enricher(handler)
    await enricher.enrich("t", _identity(jti="shared", sub=SUB))
    assert calls["n"] == 1

    other = "99999999-9999-4999-8999-999999999999"
    with pytest.raises(PrincipalEnrichmentError):
        await enricher.enrich("t", _identity(jti="shared", sub=other))
    assert calls["n"] == 2  # proves B did NOT read A's cache entry


async def test_cache_expires_after_ttl() -> None:
    calls = {"n": 0}
    clock = {"t": 1000.0}

    def handler(_request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_payload())

    enricher = _enricher(handler, cache_ttl_seconds=30.0, clock=lambda: clock["t"])
    identity = _identity(jti="jti-ttl")
    await enricher.enrich("t", identity)
    clock["t"] += 31.0  # past TTL
    await enricher.enrich("t", identity)
    assert calls["n"] == 2

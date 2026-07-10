"""Shared types for the HIMS Python authorization PEP (``hims_authz``).

Mirrors the identity + Cerbos-principal contracts from the TS side
(``@hims/ts-sdk-identity`` ``Principal`` and ``@hims/ts-sdk-authz`` ``principalAttrsForCerbos``)
so a single Cerbos policy set governs both the TS and Python services consistently.
"""

from __future__ import annotations

from dataclasses import dataclass


class AuthzError(Exception):
    """Base class for all ``hims_authz`` failures."""


class IdentityVerificationError(AuthzError):
    """JWT failed in-process verification (signature, claims, algorithm, age).

    The caller could not be identified. Maps to HTTP 401.
    """


class PrincipalEnrichmentError(AuthzError):
    """The enriched principal could not be obtained from User Management.

    This is treated as **fail-closed**: without capabilities the caller cannot be
    authorized. Maps to HTTP 401 (identity/enrichment could not be established).
    """


class AuthorizationError(AuthzError):
    """Cerbos denied the action, or the PDP could not be reached.

    A PDP that is unreachable is treated as a **deny** (fail-closed), never an allow.
    Maps to HTTP 403.
    """


@dataclass(frozen=True)
class VerifiedIdentity:
    """Identity claims proven by in-process RS256/JWKS verification.

    This is identity only — NOT authorization. Authorization attributes (capabilities,
    clearances, ...) are resolved separately by enrichment against User Management.
    Mirrors the identity half of ``@hims/ts-sdk-identity`` ``Principal``.
    """

    user_id: str
    """JWT ``sub``."""
    tenant_id: str
    """JWT ``iq_tenant_id`` — the only claim mapped to tenant scope."""
    org_id: str
    """JWT ``org_id`` (distinct from tenant); ``""`` when absent."""
    roles: tuple[str, ...]
    """Normalized JWT ``roles`` (trimmed, lowercased, deduped, sorted)."""
    department: str | None
    session_id: str
    jti: str
    iat: int
    exp: int
    iss: str


@dataclass(frozen=True)
class CerbosPrincipal:
    """Cerbos principal wire object (``id``, ``roles``, ``attr``) ready for a check.

    ``attr`` carries the enriched ABAC attributes exactly as User Management materializes
    them for Cerbos — ``iq_tenant_id``, ``capabilities``, ``delegated_capabilities``,
    ``role_codes``, ``clearances``, ``um_clearance_effective_tier``, ``department``,
    ``org_id`` (and optionally ``tenant_entitlement_revision``). Policies read these keys.
    ``roles`` mirrors ``buildCerbosPrincipalWire``: the canonical role codes, or the
    ``__hims_authenticated__`` fallback when the caller has no role codes.
    """

    id: str
    roles: tuple[str, ...]
    attr: dict[str, object]


@dataclass(frozen=True)
class AuthzSettings:
    """PEP configuration. The consuming service reads its environment and builds this.

    ``issuer``/``audience`` are strict allowlists (a single value or several); a token's
    ``iss``/``aud`` must match one entry exactly.
    """

    jwks_url: str
    issuer: str | tuple[str, ...]
    audience: str | tuple[str, ...]
    cerbos_http_url: str
    """Base URL of the Cerbos PDP HTTP API, e.g. ``http://localhost:3592``."""
    principal_url: str
    """Full URL of User Management ``GET /auth/principal`` used for enrichment."""
    max_token_age_seconds: int = 300
    clock_skew_seconds: int = 60
    enrichment_cache_ttl_seconds: float = 30.0
    http_timeout_seconds: float = 5.0
    cerbos_timeout_seconds: float = 2.0

"""In-process JWT verification (RS256 against the edge JWKS).

Python mirror of ``@hims/ts-sdk-identity`` ``verifyToken``. This is what actually closes
the direct-to-service bypass: a caller reaching opd/master-data directly must present a
JWT that verifies against the same JWKS the edge uses — an absent or forged token is
rejected here, in-process, before any handler runs.

Canonical tooling: PyJWT ``PyJWKClient`` (per-``kid`` cached, auto-refresh on unknown kid)
+ ``jwt.decode`` with RS256/audience/issuer/leeway. PyJWT has no ``max_age`` option, so the
``maxTokenAge`` bound is enforced with an explicit ``iat`` check (matching the TS side).
"""

from __future__ import annotations

import time
from collections.abc import Callable

import jwt
from jwt import PyJWK, PyJWKClient

from hims_authz.types import IdentityVerificationError, VerifiedIdentity

DEFAULT_MAX_TOKEN_AGE_SECONDS = 300
MAX_ALLOWED_TOKEN_AGE_SECONDS = 900
DEFAULT_CLOCK_SKEW_SECONDS = 60
MAX_CLOCK_SKEW_SECONDS = 60
ALLOWED_ALGORITHMS = ("RS256",)
# Mirrors verify.ts: session_id is intentionally NOT required (better-auth uses jti +
# short-lived tokens; session state is server-side).
REQUIRED_CLAIMS = ("sub", "iq_tenant_id", "roles", "jti", "exp", "iat")

# token -> verification key (PyJWK or a raw key). Injectable so tests can supply a key
# directly without standing up a JWKS HTTP endpoint.
SigningKeyResolver = Callable[[str], object]


def _normalize_allowlist(value: str | tuple[str, ...], field: str) -> list[str]:
    values = [value] if isinstance(value, str) else list(value)
    normalized = [v.strip() for v in values if isinstance(v, str) and v.strip()]
    if not normalized:
        raise IdentityVerificationError(f"{field} allowlist cannot be empty")
    # dedupe, preserve order
    return list(dict.fromkeys(normalized))


def _resolve_bounded(value: int, default: int, lo: int, hi: int, field: str) -> int:
    resolved = default if value is None else value
    if not isinstance(resolved, int) or resolved < lo or resolved > hi:
        raise IdentityVerificationError(f"{field} must be within {lo}-{hi}")
    return resolved


def _sanitize_roles(raw: object) -> tuple[str, ...]:
    if not isinstance(raw, list):
        raise IdentityVerificationError("roles claim must be an array")
    normalized = {
        r.strip().lower() for r in raw if isinstance(r, str) and r.strip()
    }
    return tuple(sorted(normalized))


def _require_non_empty_str(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IdentityVerificationError(f"{field} claim is required")
    return value.strip()


def _resolve_org_id(tenant_id: str, raw: object) -> str:
    if not isinstance(raw, str):
        return ""
    trimmed = raw.strip()
    if not trimmed:
        return ""
    if trimmed == tenant_id:
        raise IdentityVerificationError(
            "iq_tenant_id and org_id must represent distinct scopes when org_id is set"
        )
    return trimmed


class TokenVerifier:
    """Verifies an access token and returns a :class:`VerifiedIdentity`.

    Construct once per process and reuse — ``PyJWKClient`` caches signing keys internally.
    """

    def __init__(
        self,
        *,
        jwks_url: str | None = None,
        issuer: str | tuple[str, ...],
        audience: str | tuple[str, ...],
        max_token_age_seconds: int = DEFAULT_MAX_TOKEN_AGE_SECONDS,
        clock_skew_seconds: int = DEFAULT_CLOCK_SKEW_SECONDS,
        signing_key_resolver: SigningKeyResolver | None = None,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._issuers = _normalize_allowlist(issuer, "issuer")
        self._audiences = _normalize_allowlist(audience, "audience")
        self._max_age = _resolve_bounded(
            max_token_age_seconds, DEFAULT_MAX_TOKEN_AGE_SECONDS,
            1, MAX_ALLOWED_TOKEN_AGE_SECONDS, "max_token_age_seconds",
        )
        self._skew = _resolve_bounded(
            clock_skew_seconds, DEFAULT_CLOCK_SKEW_SECONDS,
            0, MAX_CLOCK_SKEW_SECONDS, "clock_skew_seconds",
        )
        self._clock = clock

        if signing_key_resolver is not None:
            self._resolve_key = signing_key_resolver
        elif jwks_url:
            client = PyJWKClient(jwks_url)

            def _from_jwks(token: str) -> object:
                signing_key: PyJWK = client.get_signing_key_from_jwt(token)
                return signing_key.key

            self._resolve_key = _from_jwks
        else:
            raise IdentityVerificationError("jwks_url or signing_key_resolver is required")

    def verify(self, token: str) -> VerifiedIdentity:
        """Return the verified identity, or raise :class:`IdentityVerificationError`."""
        self._assert_header(token)

        try:
            key = self._resolve_key(token)
        except jwt.PyJWTError as exc:
            raise IdentityVerificationError(f"signing key resolution failed: {exc}") from exc

        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=list(ALLOWED_ALGORITHMS),
                audience=self._audiences,
                issuer=self._issuers,
                leeway=self._skew,
                options={"require": list(REQUIRED_CLAIMS)},
            )
        except jwt.PyJWTError as exc:
            raise IdentityVerificationError(str(exc)) from exc

        self._assert_token_age(payload.get("iat"))
        return self._to_identity(payload)

    def _assert_header(self, token: str) -> None:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise IdentityVerificationError(f"malformed token header: {exc}") from exc
        kid = header.get("kid")
        alg = header.get("alg")
        if not isinstance(kid, str) or not kid:
            raise IdentityVerificationError("JWT protected header missing kid")
        if not isinstance(alg, str) or alg not in ALLOWED_ALGORITHMS:
            raise IdentityVerificationError(f"unsupported JWT algorithm: {alg}")

    def _assert_token_age(self, iat: object) -> None:
        if not isinstance(iat, (int, float)):
            raise IdentityVerificationError("iat claim is required")
        now = self._clock()
        if iat > now + self._skew:
            raise IdentityVerificationError("iat is in the future")
        if now - iat > self._max_age + self._skew:
            raise IdentityVerificationError("token exceeds maximum age")

    def _to_identity(self, payload: dict[str, object]) -> VerifiedIdentity:
        user_id = _require_non_empty_str(payload.get("sub"), "sub")
        tenant_id = _require_non_empty_str(payload.get("iq_tenant_id"), "iq_tenant_id")
        iss = _require_non_empty_str(payload.get("iss"), "iss")
        jti = _require_non_empty_str(payload.get("jti"), "jti")
        org_id = _resolve_org_id(tenant_id, payload.get("org_id"))

        iat = payload.get("iat")
        exp = payload.get("exp")
        if not isinstance(iat, (int, float)):
            raise IdentityVerificationError("iat claim is required")
        if not isinstance(exp, (int, float)):
            raise IdentityVerificationError("exp claim is required")

        department_raw = payload.get("department")
        department = (
            department_raw.strip()
            if isinstance(department_raw, str) and department_raw.strip()
            else None
        )
        session_raw = payload.get("session_id")
        session_id = (
            session_raw.strip()
            if isinstance(session_raw, str) and session_raw.strip()
            else ""
        )

        return VerifiedIdentity(
            user_id=user_id,
            tenant_id=tenant_id,
            org_id=org_id,
            roles=_sanitize_roles(payload.get("roles")),
            department=department,
            session_id=session_id,
            jti=jti,
            iat=int(iat),
            exp=int(exp),
            iss=iss,
        )

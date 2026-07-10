"""Sincere RS256/JWKS verification tests — real signatures, real rejections."""

from __future__ import annotations

import time
from collections.abc import Callable

import jwt
import pytest

from hims_authz.types import IdentityVerificationError, VerifiedIdentity
from hims_authz.verify import TokenVerifier

from .conftest import AUDIENCE, ISSUER


@pytest.fixture
def verifier(signing_key_resolver: Callable[[str], str]) -> TokenVerifier:
    return TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=signing_key_resolver
    )


def test_valid_token_yields_identity(verifier: TokenVerifier, make_token) -> None:
    token = make_token(roles=["Doctor", "doctor", " Nurse "], org_id="org-9")
    identity = verifier.verify(token)
    assert isinstance(identity, VerifiedIdentity)
    assert identity.user_id == "11111111-1111-4111-8111-111111111111"
    assert identity.tenant_id == "tenant-a"
    assert identity.org_id == "org-9"
    # normalized: trimmed, lowercased, deduped, sorted
    assert identity.roles == ("doctor", "nurse")
    assert identity.jti == "jti-1"


def test_wrong_key_signature_is_rejected(
    verifier: TokenVerifier, make_token, other_rsa_keys: tuple[str, str]
) -> None:
    forged = make_token(key_pem=other_rsa_keys[0])  # signed by an unrelated key
    with pytest.raises(IdentityVerificationError):
        verifier.verify(forged)


def test_unsigned_token_is_rejected(verifier: TokenVerifier, make_token) -> None:
    # A caller cannot bypass verification with alg=none.
    unsigned = make_token(algorithm="none", key_pem="")
    with pytest.raises(IdentityVerificationError):
        verifier.verify(unsigned)


def test_hs256_token_is_rejected(verifier: TokenVerifier, make_token) -> None:
    hs = make_token(algorithm="HS256", key_pem="shared-secret")
    with pytest.raises(IdentityVerificationError):
        verifier.verify(hs)


def test_wrong_issuer_is_rejected(verifier: TokenVerifier, make_token) -> None:
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(iss="https://evil.example.com"))


def test_wrong_audience_is_rejected(verifier: TokenVerifier, make_token) -> None:
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(aud="some-other-service"))


def test_missing_audience_is_rejected(verifier: TokenVerifier, make_token, omit) -> None:
    # aud is not in REQUIRED_CLAIMS; presence is enforced only because audience= is passed.
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(aud=omit))


def test_jwks_key_resolution_failure_fails_closed(make_token) -> None:
    # A JWKS lookup failure (unknown kid, PDP unreachable) must reject, not crash-through.
    def boom(_token: str) -> object:
        raise jwt.PyJWTError("jwks unreachable")

    verifier = TokenVerifier(issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=boom)
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token())


def test_expired_token_is_rejected(verifier: TokenVerifier, make_token) -> None:
    now = int(time.time())
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(iat=now - 400, exp=now - 100))


def test_token_exceeding_max_age_is_rejected(verifier: TokenVerifier, make_token) -> None:
    # Not expired (exp in the future), but issued too long ago (> 300 + 60 skew).
    now = int(time.time())
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(iat=now - 400, exp=now + 300))


def test_future_iat_is_rejected(verifier: TokenVerifier, make_token) -> None:
    now = int(time.time())
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(iat=now + 200, exp=now + 500))


@pytest.mark.parametrize("claim", ["sub", "iq_tenant_id", "jti", "iat", "exp"])
def test_missing_required_claim_is_rejected(
    verifier: TokenVerifier, make_token, omit, claim: str
) -> None:
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(**{claim: omit}))


def test_roles_not_array_is_rejected(verifier: TokenVerifier, make_token) -> None:
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(roles="doctor"))


def test_missing_kid_header_is_rejected(verifier: TokenVerifier, make_token) -> None:
    # kid header dropped -> reject before key resolution.
    token = make_token(headers={"kid": None})
    with pytest.raises(IdentityVerificationError):
        verifier.verify(token)


def test_org_id_equal_to_tenant_is_rejected(verifier: TokenVerifier, make_token) -> None:
    with pytest.raises(IdentityVerificationError):
        verifier.verify(make_token(org_id="tenant-a"))


def test_org_id_absent_is_empty_string(verifier: TokenVerifier, make_token, omit) -> None:
    identity = verifier.verify(make_token(org_id=omit))
    assert identity.org_id == ""


def test_max_age_bound_enforced_on_construction(
    signing_key_resolver: Callable[[str], str],
) -> None:
    with pytest.raises(IdentityVerificationError):
        TokenVerifier(
            issuer=ISSUER,
            audience=AUDIENCE,
            max_token_age_seconds=100_000,  # > 900 cap
            signing_key_resolver=signing_key_resolver,
        )


def test_empty_issuer_allowlist_rejected(
    signing_key_resolver: Callable[[str], str],
) -> None:
    with pytest.raises(IdentityVerificationError):
        TokenVerifier(
            issuer="", audience=AUDIENCE, signing_key_resolver=signing_key_resolver
        )

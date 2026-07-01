"""Shared test fixtures — a real RSA keypair + an RS256 token factory.

Verification tests use genuine RS256 signatures (a tampered token or a wrong key fails
real cryptography, not a stub), so the suite proves actual signature checking. Only the
JWKS *fetch* is bypassed via an injected ``signing_key_resolver`` — the crypto is real.
"""

from __future__ import annotations

import time
from collections.abc import Callable

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER = "http://localhost:3000"
AUDIENCE = "hims-platform"
KID = "test-key-1"


def _pem_pair(key: rsa.RSAPrivateKey) -> tuple[str, str]:
    private_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


@pytest.fixture(scope="session")
def rsa_keys() -> tuple[str, str]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return _pem_pair(key)


@pytest.fixture(scope="session")
def other_rsa_keys() -> tuple[str, str]:
    """A second, unrelated keypair — used to prove wrong-key signatures are rejected."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return _pem_pair(key)


@pytest.fixture
def private_pem(rsa_keys: tuple[str, str]) -> str:
    return rsa_keys[0]


@pytest.fixture
def public_pem(rsa_keys: tuple[str, str]) -> str:
    return rsa_keys[1]


@pytest.fixture
def signing_key_resolver(public_pem: str) -> Callable[[str], str]:
    return lambda _token: public_pem


@pytest.fixture
def make_token(private_pem: str) -> Callable[..., str]:
    """Factory returning a signed RS256 token; defaults are a valid HIMS access token."""

    def _make(
        *,
        key_pem: object = _UNSET,
        algorithm: str = "RS256",
        headers: dict | None = None,
        **claim_overrides: object,
    ) -> str:
        now = int(time.time())
        claims: dict[str, object] = {
            "sub": "11111111-1111-4111-8111-111111111111",
            "iq_tenant_id": "tenant-a",
            "roles": ["doctor"],
            "jti": "jti-1",
            "iat": now,
            "exp": now + 300,
            "iss": ISSUER,
            "aud": AUDIENCE,
        }
        claims.update(claim_overrides)
        # Drop claims explicitly set to the omit sentinel to test missing claims.
        claims = {k: v for k, v in claims.items() if v is not _OMIT}
        hdr = {"kid": KID}
        if headers is not None:
            hdr = {**hdr, **headers}
        # A None header value means "omit this header" (e.g. drop kid entirely).
        hdr = {k: v for k, v in hdr.items() if v is not None}
        signing_key = private_pem if key_pem is _UNSET else key_pem
        return jwt.encode(claims, signing_key, algorithm=algorithm, headers=hdr)

    return _make


class _Omit:
    """Sentinel for omitting a claim from the token."""


_OMIT = _Omit()
# Distinct sentinel for "no key_pem argument passed" (so an explicit None/"" is honored,
# e.g. to sign an alg=none token — a plain ``or`` fallback would swallow those).
_UNSET = object()


@pytest.fixture
def omit() -> _Omit:
    return _OMIT

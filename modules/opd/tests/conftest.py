"""Pytest fixtures for the OPD module."""

from __future__ import annotations

import time
from collections.abc import Generator
from uuid import UUID, uuid4

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from hims_authz import Authz, CerbosPrincipal, TokenVerifier

from opd import create_app

TENANT_A = UUID("00000000-0000-0000-0000-000000000001")
TENANT_B = UUID("00000000-0000-0000-0000-000000000002")
PATIENT_ID = UUID("00000000-0000-0000-0000-000000000010")
DOCTOR_ID = UUID("00000000-0000-0000-0000-000000000020")

# --- Test PEP (real RS256 verification; stubbed enrichment + Cerbos) --------------
# Verification is genuine: tokens are signed with a real RSA key and the verifier resolves
# the matching public key, so a missing/forged/expired token really is rejected (401).
# Enrichment + the Cerbos decision are stubbed so unit tests don't need UM or a live PDP —
# policy correctness itself is covered by infra/cerbos/tests/opd_permissions_test.yaml.

_ISSUER = "http://localhost:3000"
_AUDIENCE = "hims-platform"
_ALL_OPD_CAPABILITIES = (
    "opd:prescription:create",
    "opd:prescription:read",
    "opd:prescription:update",
    "opd:prescription:delete",
    "opd:health-document:create",
    "opd:health-document:read",
)

_signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PRIVATE_PEM = _signing_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
_PUBLIC_PEM = (
    _signing_key.public_key()
    .public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    .decode()
)


def mint_token(
    tenant_id: UUID = TENANT_A,
    doctor_id: UUID = DOCTOR_ID,
    *,
    key_pem: str | None = None,
    **claim_overrides: object,
) -> str:
    now = int(time.time())
    claims: dict[str, object] = {
        "sub": str(doctor_id),
        "iq_tenant_id": str(tenant_id),
        "roles": ["doctor"],
        "jti": f"jti-{doctor_id}-{now}",
        "iat": now,
        "exp": now + 300,
        "iss": _ISSUER,
        "aud": _AUDIENCE,
    }
    claims.update(claim_overrides)
    return jwt.encode(claims, key_pem or _PRIVATE_PEM, algorithm="RS256", headers={"kid": "test"})


class _StubEnricher:
    """Returns a Cerbos principal for the verified identity without calling User Management."""

    def __init__(self, capabilities: tuple[str, ...]) -> None:
        self._caps = list(capabilities)

    async def enrich(self, token: str, identity) -> CerbosPrincipal:
        return CerbosPrincipal(
            id=identity.user_id,
            roles=tuple(identity.roles) or ("__hims_authenticated__",),
            attr={
                "iq_tenant_id": identity.tenant_id,
                "role_codes": list(identity.roles),
                "capabilities": self._caps,
                "delegated_capabilities": [],
                "clearances": {},
                "um_clearance_effective_tier": 0,
            },
        )

    async def aclose(self) -> None:
        pass


class _StubAuthzClient:
    """Cerbos decision stub — ``allow`` gates every check (policy logic is tested separately)."""

    def __init__(self, allow: bool) -> None:
        self._allow = allow

    async def is_allowed(self, principal, kind, action, resource_id, resource_attr) -> bool:
        return self._allow

    async def assert_reachable(self) -> None:
        pass

    async def aclose(self) -> None:
        pass


def build_test_authz(
    *, capabilities: tuple[str, ...] = _ALL_OPD_CAPABILITIES, allow: bool = True
) -> Authz:
    verifier = TokenVerifier(
        issuer=_ISSUER, audience=_AUDIENCE, signing_key_resolver=lambda _t: _PUBLIC_PEM
    )
    return Authz(
        verifier=verifier,
        enricher=_StubEnricher(capabilities),
        client=_StubAuthzClient(allow=allow),
    )


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app(deps={"authz": build_test_authz()})
    with TestClient(app) as test_client:
        yield test_client


def make_create_payload(
    *,
    visit_id: str | UUID | None = None,
    patient_id: UUID = PATIENT_ID,
) -> dict:
    """Request body for POST /prescriptions.

    tenant_id and doctor_id are NO LONGER body fields — they are resolved from the
    iq_tenant_id / x-user-id request headers (see tenant_headers below).
    """
    return {
        "visit_id": str(visit_id or uuid4()),
        "patient_id": str(patient_id),
        "clinical": {
            "chief_complaints": [
                {"line_no": 1, "complaint_text": "Fever"},
            ],
        },
    }


def tenant_headers(
    tenant_id: UUID = TENANT_A,
    doctor_id: UUID = DOCTOR_ID,
) -> dict[str, str]:
    """Authorization header carrying a verified JWT for the given tenant/doctor.

    The PEP resolves tenant (``iq_tenant_id``) and acting doctor (``sub``) from this verified
    token — never from raw headers — so a tenant B token scopes the request to tenant B.
    """
    return {"Authorization": f"Bearer {mint_token(tenant_id, doctor_id)}"}

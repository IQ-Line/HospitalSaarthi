import os
import time
from collections.abc import Iterator
from uuid import UUID

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from hims_authz import Authz, CerbosPrincipal, TokenVerifier
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base


@pytest.fixture(autouse=True)
def _api_prefix_for_tests() -> Iterator[None]:
    """Force a stable API prefix for tests (overrides workspace or package `.env`)."""
    os.environ["MASTER_DATA_API_PREFIX"] = "/api/v1/master-data"
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# --- Test PEP (real RS256 verification; stubbed enrichment + Cerbos) --------------
# The identity gate + guards are exercised for real: tokens are signed with a genuine RSA key
# and the verifier resolves the matching public key, so a missing/forged/expired token really
# is rejected (401). Enrichment + the Cerbos decision are stubbed so the catalog CRUD tests
# don't need User Management or a live PDP — policy correctness is covered separately by
# infra/cerbos/tests/master_data_permissions_test.yaml.

_ISSUER = "http://localhost:3000"
_AUDIENCE = "hims-platform"
_ACTOR_ID = UUID("00000000-0000-0000-0000-0000000000aa")
_TENANT_A = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
# The write capabilities the five catalog guards check. The stub PDP allows regardless, so
# these gate nothing in CRUD tests; they document the surface and back the enriched principal.
_ALL_MD_CAPABILITIES = (
    "master-data:module:create",
    "master-data:module:update",
    "master-data:module:delete",
    "master-data:permission:create",
    "master-data:permission:update",
    "master-data:permission:delete",
    "master-data:system-role:create",
    "master-data:system-role:update",
    "master-data:system-role:delete",
    "master-data:module-permission:create",
    "master-data:module-permission:update",
    "master-data:module-permission:delete",
    "master-data:department:create",
    "master-data:department:update",
    "master-data:department:delete",
)

_signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PRIVATE_PEM = _signing_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
_PUBLIC_PEM = (
    _signing_key.public_key()
    .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    .decode()
)


def mint_token(
    actor_id: UUID = _ACTOR_ID,
    tenant_id: UUID = _TENANT_A,
    *,
    key_pem: str | None = None,
    **claim_overrides: object,
) -> str:
    """Sign a JWT the test verifier accepts (or, with a foreign key, one it rejects)."""
    now = int(time.time())
    claims: dict[str, object] = {
        "sub": str(actor_id),
        "iq_tenant_id": str(tenant_id),
        "roles": ["platform-operator"],
        "jti": f"jti-{actor_id}-{now}",
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

    async def enrich(self, _token: str, identity) -> CerbosPrincipal:
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
    """Cerbos decision stub — ``allow`` gates every check (policy logic is tested separately).

    Records every check so a test can assert what the guard actually sent to Cerbos (the
    ``resource_attr`` a stub would otherwise swallow — e.g. the department scope tenant).
    """

    def __init__(self, allow: bool) -> None:
        self._allow = allow
        self.calls: list[dict] = []

    async def is_allowed(self, _principal, kind, action, resource_id, resource_attr) -> bool:
        self.calls.append(
            {"kind": kind, "action": action, "resource_attr": dict(resource_attr)}
        )
        return self._allow

    async def assert_reachable(self) -> None:
        pass

    async def aclose(self) -> None:
        pass


def build_test_authz(
    *,
    capabilities: tuple[str, ...] = _ALL_MD_CAPABILITIES,
    allow: bool = True,
    client: _StubAuthzClient | None = None,
) -> Authz:
    verifier = TokenVerifier(
        issuer=_ISSUER, audience=_AUDIENCE, signing_key_resolver=lambda _t: _PUBLIC_PEM
    )
    return Authz(
        verifier=verifier,
        enricher=_StubEnricher(capabilities),
        client=client or _StubAuthzClient(allow=allow),
    )


# A second, unrelated keypair — tokens signed with it are validly-formed but the verifier
# resolves the real public key, so they must be REJECTED (forged-signature 401).
_foreign_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_FOREIGN_PRIVATE_PEM = _foreign_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()


def make_auth_headers(actor_id: UUID = _ACTOR_ID, tenant_id: UUID = _TENANT_A) -> dict[str, str]:
    """Authorization header carrying a verified JWT (identity + audit ``sub``) for requests."""
    return {"Authorization": f"Bearer {mint_token(actor_id, tenant_id)}"}


@pytest.fixture()
def test_authz() -> Authz:
    """A stub PEP (real verification, stubbed enrich + allow-all Cerbos) for ``create_app``."""
    return build_test_authz()


@pytest.fixture()
def denying_authz() -> Authz:
    """Same real verification, but the Cerbos stub DENIES every check (→ 403 on guarded writes)."""
    return build_test_authz(allow=False)


@pytest.fixture()
def recording_deny_authz() -> tuple[Authz, _StubAuthzClient]:
    """A denying PEP whose Cerbos stub records each check — to assert what the guard sent."""
    client = _StubAuthzClient(allow=False)
    return build_test_authz(client=client), client


@pytest.fixture()
def actor_sub() -> str:
    """The ``sub`` carried by :func:`make_auth_headers` — the expected audit actor id."""
    return str(_ACTOR_ID)


@pytest.fixture()
def forged_auth_headers() -> dict[str, str]:
    """A validly-formed token signed by a FOREIGN key — the verifier must reject it (401)."""
    return {"Authorization": f"Bearer {mint_token(key_pem=_FOREIGN_PRIVATE_PEM)}"}


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    """Default bearer header for authenticated catalog requests."""
    return make_auth_headers()


@pytest.fixture()
def sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_attach(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_tenant")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_global")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)

    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)

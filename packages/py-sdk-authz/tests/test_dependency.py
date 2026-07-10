"""End-to-end FastAPI tests — verify + enrich + authorize + the identity gate.

Uses a real RS256 token, a mocked UM ``/auth/principal``, and a fake Cerbos PDP, wired
through the real ``Authz`` dependency and ``IdentityGateMiddleware``.
"""

from __future__ import annotations

import httpx
from fastapi import Depends, FastAPI
from starlette.testclient import TestClient

from hims_authz.client import AuthzClient
from hims_authz.dependency import Authz
from hims_authz.enrichment import PrincipalEnricher
from hims_authz.middleware import IdentityGateMiddleware
from hims_authz.verify import TokenVerifier

from .conftest import AUDIENCE, ISSUER

SUB = "11111111-1111-4111-8111-111111111111"


def _um_payload() -> dict:
    return {
        "id": SUB,
        "roles": ["doctor"],
        "attributes": {
            "iq_tenant_id": "tenant-a",
            "department": None,
            "org_id": None,
            "role_codes": ["doctor"],
            "capabilities": ["opd:prescription:read"],
            "delegated_capabilities": [],
            "clearances": {},
            "um_clearance_effective_tier": 0,
        },
    }


class _FakeCerbos:
    def __init__(self, result: object) -> None:
        self.result = result

    async def is_allowed(self, action, principal, resource) -> bool:
        if isinstance(self.result, Exception):
            raise self.result
        return self.result  # type: ignore[return-value]

    async def close(self) -> None:
        pass


def _authz(public_pem: str, *, cerbos_result: object = True, um_status: int = 200) -> Authz:
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )

    def um_handler(_request: httpx.Request) -> httpx.Response:
        if um_status != 200:
            return httpx.Response(um_status, json={"detail": "nope"})
        return httpx.Response(200, json=_um_payload())

    enricher = PrincipalEnricher(
        principal_url="http://user-management/auth/principal",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(um_handler)),
    )
    client = AuthzClient(cerbos_http_url="http://cerbos:3592")
    client._client = _FakeCerbos(cerbos_result)
    return Authz(verifier=verifier, enricher=enricher, client=client)


def _app(authz: Authz, *, verifier: TokenVerifier | None = None) -> FastAPI:
    app = FastAPI()
    if verifier is not None:
        app.add_middleware(
            IdentityGateMiddleware, verifier=verifier, public_path_prefixes=("/health",)
        )

    # Build the guard once (module/closure-level singleton) — the SDK-consumer idiom that
    # keeps only fastapi.Depends in the argument default (B008-clean).
    read_guard = authz.require("opd:prescription", "read")

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True}

    @app.get("/prescriptions/{prescription_id}")
    async def read(prescription_id: str, principal=Depends(read_guard)) -> dict:
        return {"id": prescription_id, "principal": principal.id}

    @app.get("/whoami")
    async def whoami() -> dict:
        return {"ok": True}

    return app


def test_valid_token_and_allow_returns_200(public_pem: str, make_token) -> None:
    client = TestClient(_app(_authz(public_pem)))
    res = client.get(
        "/prescriptions/rx-1", headers={"Authorization": f"Bearer {make_token()}"}
    )
    assert res.status_code == 200
    assert res.json() == {"id": "rx-1", "principal": SUB}


def test_missing_token_returns_401(public_pem: str) -> None:
    client = TestClient(_app(_authz(public_pem)))
    res = client.get("/prescriptions/rx-1")
    assert res.status_code == 401


def test_forged_token_returns_401(
    public_pem: str, make_token, other_rsa_keys: tuple[str, str]
) -> None:
    client = TestClient(_app(_authz(public_pem)))
    forged = make_token(key_pem=other_rsa_keys[0])
    res = client.get(
        "/prescriptions/rx-1", headers={"Authorization": f"Bearer {forged}"}
    )
    assert res.status_code == 401


def test_cerbos_deny_returns_403(public_pem: str, make_token) -> None:
    client = TestClient(_app(_authz(public_pem, cerbos_result=False)))
    res = client.get(
        "/prescriptions/rx-1", headers={"Authorization": f"Bearer {make_token()}"}
    )
    assert res.status_code == 403


def test_enrichment_failure_returns_401(public_pem: str, make_token) -> None:
    client = TestClient(_app(_authz(public_pem, um_status=500)))
    res = client.get(
        "/prescriptions/rx-1", headers={"Authorization": f"Bearer {make_token()}"}
    )
    assert res.status_code == 401


def test_cerbos_outage_fails_closed_403(public_pem: str, make_token) -> None:
    authz = _authz(public_pem, cerbos_result=RuntimeError("pdp down"))
    client = TestClient(_app(authz))
    res = client.get(
        "/prescriptions/rx-1", headers={"Authorization": f"Bearer {make_token()}"}
    )
    assert res.status_code == 403


# -- IdentityGateMiddleware --------------------------------------------------------


def test_middleware_allows_public_path_without_token(public_pem: str) -> None:
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )
    client = TestClient(_app(_authz(public_pem), verifier=verifier))
    assert client.get("/health").status_code == 200


def test_middleware_blocks_protected_path_without_token(public_pem: str) -> None:
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )
    client = TestClient(_app(_authz(public_pem), verifier=verifier))
    # /whoami has no per-route guard, but the gate still requires a valid JWT.
    assert client.get("/whoami").status_code == 401


def test_middleware_passes_authenticated_request(public_pem: str, make_token) -> None:
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )
    client = TestClient(_app(_authz(public_pem), verifier=verifier))
    res = client.get("/whoami", headers={"Authorization": f"Bearer {make_token()}"})
    assert res.status_code == 200


def test_middleware_public_prefix_boundary_is_gated(public_pem: str) -> None:
    # `/health` is public but `/healthz` is NOT — the trailing-"/" boundary must hold.
    # (No /healthz route exists; the gate must 401 before routing, not 404.)
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )
    client = TestClient(_app(_authz(public_pem), verifier=verifier))
    assert client.get("/healthz").status_code == 401


def test_middleware_rejects_forged_token(
    public_pem: str, make_token, other_rsa_keys: tuple[str, str]
) -> None:
    # Exercises the gate's own verify-failure catch path (distinct from missing-token).
    verifier = TokenVerifier(
        issuer=ISSUER, audience=AUDIENCE, signing_key_resolver=lambda _t: public_pem
    )
    client = TestClient(_app(_authz(public_pem), verifier=verifier))
    forged = make_token(key_pem=other_rsa_keys[0])
    res = client.get("/whoami", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401

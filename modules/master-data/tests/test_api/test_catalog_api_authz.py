"""In-process PEP wiring for the Master Data catalog (the seam the CRUD stubs don't cover).

The CRUD integration suites run with an allow-all Cerbos stub, so they exercise the handlers
but not the gate/guard rejection paths. These tests prove the wiring itself:

* the fail-closed identity gate rejects missing / malformed / forged tokens with 401
  (writes AND reads),
* a Cerbos DENY becomes a 403 on EVERY capability-guarded catalog write — all five catalogs,
  every write verb (POST create, PATCH update, DELETE, department import) — so a single write
  route left unguarded is caught here (the allow-all CRUD stubs would not notice),
* the scope-aware department guard sends the request's catalog-scope tenant to Cerbos while the
  global-catalog guard sends no tenant (the reason two guards exist),
* catalog reads are identity-gate-only — authenticated but NOT capability-gated — so they still
  succeed when Cerbos would deny (the deliberate design choice in build-plan §10),
* the health endpoint stays public (no token required).
"""

from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from hims_authz import Authz

from app.api.deps import get_module_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app

_PREFIX = "/api/v1/master-data"
_MODULES = f"{_PREFIX}/modules"
_HEALTH = f"{_PREFIX}/health"
_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"  # canonical/lowercase so it round-trips
_ID = str(uuid4())  # target for PATCH / DELETE (the guard runs before the row is looked up)

_MODULE_BODY = {"name": "x", "slug": "x", "category": "clinical", "version": "1.0.0"}

# (id, method, url, body) — one row per guarded write on the five catalogs. Bodies are valid so
# the ONLY failure a guarded request can hit is the capability guard (not 422 body validation);
# update bodies are {} because every *Update schema is all-optional.
_WRITES: list[tuple[str, str, str, dict | None]] = [
    ("modules.create", "POST", _MODULES, _MODULE_BODY),
    ("modules.update", "PATCH", f"{_MODULES}/{_ID}", {}),
    ("modules.delete", "DELETE", f"{_MODULES}/{_ID}", None),
    (
        "permissions.create",
        "POST",
        f"{_PREFIX}/permissions",
        {"name": "x", "slug": "x", "action": "read"},
    ),
    ("permissions.update", "PATCH", f"{_PREFIX}/permissions/{_ID}", {}),
    ("permissions.delete", "DELETE", f"{_PREFIX}/permissions/{_ID}", None),
    ("system-roles.create", "POST", f"{_PREFIX}/system-roles", {"name": "x", "slug": "x"}),
    ("system-roles.update", "PATCH", f"{_PREFIX}/system-roles/{_ID}", {}),
    ("system-roles.delete", "DELETE", f"{_PREFIX}/system-roles/{_ID}", None),
    (
        "module-permissions.create",
        "POST",
        f"{_PREFIX}/module-permissions",
        {"slug": "x", "module_id": str(uuid4()), "permission_id": str(uuid4())},
    ),
    ("module-permissions.update", "PATCH", f"{_PREFIX}/module-permissions/{_ID}", {}),
    ("module-permissions.delete", "DELETE", f"{_PREFIX}/module-permissions/{_ID}", None),
    (
        "departments.create",
        "POST",
        f"{_PREFIX}/departments",
        {"name": "Cardiology", "code": "CARD", "type": "clinical"},
    ),
    (
        "departments.import",
        "POST",
        f"{_PREFIX}/departments/import-from-platform",
        {"platform_row_ids": [str(uuid4())]},
    ),
    ("departments.update", "PATCH", f"{_PREFIX}/departments/{_ID}", {}),
    ("departments.delete", "DELETE", f"{_PREFIX}/departments/{_ID}", None),
]
_WRITE_IDS = [w[0] for w in _WRITES]


class _EmptyModuleRepo:
    """Minimal read repo so the (guard-free) list route can run without a database."""

    scope = CatalogScope(iq_tenant_id=None)

    def list_modules(self, *, category=None, module_kinds=None, visibility=None):
        return []


def _dummy_session() -> Generator[object, None, None]:
    # The guard runs as a route dependency and denies before any query, so a non-DB session is
    # enough — this keeps the write-guard assertions independent of a real database.
    class _S:
        def commit(self) -> None: ...

    yield _S()


def _wire(app):
    app.dependency_overrides[get_module_repository] = _EmptyModuleRepo
    app.dependency_overrides[get_session] = _dummy_session
    return app


@pytest.fixture()
def allow_client(test_authz: Authz) -> Generator[TestClient, None, None]:
    """Allow-all PEP; requests are UNAUTHENTICATED unless the test sends a bearer itself."""
    app = _wire(create_app(deps={"authz": test_authz}))
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def deny_client(denying_authz: Authz) -> Generator[TestClient, None, None]:
    """Real verification but Cerbos DENIES — used to prove guard 403 vs read passthrough."""
    app = _wire(create_app(deps={"authz": denying_authz}))
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_health_is_public(allow_client: TestClient) -> None:
    assert allow_client.get(_HEALTH).status_code == 200


def test_read_without_token_is_401(allow_client: TestClient) -> None:
    # The identity gate authenticates every non-public request, reads included.
    assert allow_client.get(_MODULES).status_code == 401


def test_malformed_bearer_is_401(allow_client: TestClient) -> None:
    resp = allow_client.get(_MODULES, headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_forged_signature_is_401(
    allow_client: TestClient, forged_auth_headers: dict[str, str]
) -> None:
    # A validly-formed token signed by the wrong key must fail in-process verification.
    assert allow_client.get(_MODULES, headers=forged_auth_headers).status_code == 401


@pytest.mark.parametrize("name,method,url,body", _WRITES, ids=_WRITE_IDS)
def test_write_without_token_is_401(
    allow_client: TestClient, name: str, method: str, url: str, body: dict | None
) -> None:
    assert allow_client.request(method, url, json=body).status_code == 401


@pytest.mark.parametrize("name,method,url,body", _WRITES, ids=_WRITE_IDS)
def test_every_catalog_write_is_capability_guarded(
    deny_client: TestClient,
    auth_headers: dict[str, str],
    name: str,
    method: str,
    url: str,
    body: dict | None,
) -> None:
    # Valid token (past the gate) + valid body, but the capability guard's Cerbos check
    # denies → 403. If this write were unguarded it would be 2xx/400/404/500, never 403.
    resp = deny_client.request(method, url, json=body, headers=auth_headers)
    assert resp.status_code == 403, f"{name} not capability-guarded (got {resp.status_code})"


def test_department_guard_sends_scope_tenant(
    recording_deny_authz: tuple[Authz, object], auth_headers: dict[str, str]
) -> None:
    # The whole reason department_guard exists: the tenant the write is scoped to (from the
    # iq_tenant_id header) must reach Cerbos as the resource tenant, so the policy's
    # principal==resource tenant-equality is a real check.
    authz, client = recording_deny_authz
    app = _wire(create_app(deps={"authz": authz}))
    with TestClient(app) as c:
        resp = c.post(
            f"{_PREFIX}/departments",
            json={"name": "Cardiology", "code": "CARD", "type": "clinical"},
            headers={**auth_headers, "iq_tenant_id": _TENANT},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 403
    call = client.calls[-1]
    assert call["kind"] == "master_data:department"
    assert call["resource_attr"] == {"iq_tenant_id": _TENANT}


def test_global_guard_sends_no_tenant(
    recording_deny_authz: tuple[Authz, object], auth_headers: dict[str, str]
) -> None:
    # Global catalogs are capability-only: the guard must NOT send a tenant attr (else the
    # policy would gain an unintended tenant check).
    authz, client = recording_deny_authz
    app = _wire(create_app(deps={"authz": authz}))
    with TestClient(app) as c:
        resp = c.post(_MODULES, json=_MODULE_BODY, headers=auth_headers)
    app.dependency_overrides.clear()
    assert resp.status_code == 403
    call = client.calls[-1]
    assert call["kind"] == "master_data:module"
    assert call["resource_attr"] == {}


def test_read_is_identity_gated_not_capability_gated(
    deny_client: TestClient, auth_headers: dict[str, str]
) -> None:
    # Reads carry NO capability guard: an authenticated caller lists the catalog even when
    # Cerbos would deny every write. Proves the build-plan §10 read decision.
    resp = deny_client.get(_MODULES, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"] == []

"""Internal (S2S) module-catalog route — identity-gate-skipped, self-gated by a shared secret.

``GET /internal/modules`` is called service-to-service (Configurator entitlement hydration) with
NO end-user JWT. These tests prove:

* the identity gate is SKIPPED for it — a 200 returns WITHOUT any bearer (every ``/modules`` read
  is 401 without a token; see ``test_catalog_api_authz``),
* the shared-secret self-gate rejects a missing / wrong key (401),
* an unconfigured key fails CLOSED (503) — the route is never open,
* the body is the WHOLE global catalog with each row's ``is_deleted`` flag (soft-deleted rows
  included, so a consumer can drop orphaned/deleted module ids), ignoring any tenant header.
"""

from __future__ import annotations

from collections.abc import Iterator
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from hims_authz import Authz
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.core.config import get_settings
from app.main import create_app
from app.models.module import ModulePublicModel

_PREFIX = "/api/v1/master-data"
_URL = f"{_PREFIX}/internal/modules"
_HEADER = "x-master-data-internal-key"
_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


def _module(name: str, *, is_deleted: bool = False) -> ModulePublicModel:
    return ModulePublicModel(
        id=uuid4(),
        name=name,
        slug=name,
        category="clinical",
        version="1.0.0",
        is_deleted=is_deleted,
    )


@pytest.fixture()
def internal_key(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    """Configure a known S2S key via env (wins over any workspace ``.env``)."""
    key = "test-internal-key"
    monkeypatch.setenv("MASTER_DATA_INTERNAL_API_KEY", key)
    get_settings.cache_clear()
    yield key
    get_settings.cache_clear()


def _client(session: Session, authz: Authz) -> TestClient:
    app = create_app(deps={"authz": authz})

    def _yield_session() -> Iterator[Session]:
        yield session

    app.dependency_overrides[get_session] = _yield_session
    return TestClient(app)


def test_returns_whole_global_catalog_including_deleted(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    m1, m2, deleted = _module("opd"), _module("billing"), _module("legacy", is_deleted=True)
    pg_session.add_all([m1, m2, deleted])
    pg_session.commit()

    with _client(pg_session, test_authz) as client:
        resp = client.get(_URL, headers={_HEADER: internal_key})

    assert resp.status_code == 200
    by_id = {row["id"]: row["is_deleted"] for row in resp.json()["data"]}
    assert by_id == {str(m1.id): False, str(m2.id): False, str(deleted.id): True}


def test_no_jwt_required_identity_gate_skipped(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    # A 200 WITHOUT any Authorization header proves the identity gate skips this path.
    with _client(pg_session, test_authz) as client:
        resp = client.get(_URL, headers={_HEADER: internal_key})
    assert resp.status_code == 200


def test_missing_key_is_401(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    with _client(pg_session, test_authz) as client:
        assert client.get(_URL).status_code == 401


def test_wrong_key_is_401(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    with _client(pg_session, test_authz) as client:
        assert client.get(_URL, headers={_HEADER: "wrong"}).status_code == 401


def test_unconfigured_key_fails_closed_503(
    pg_session: Session, test_authz: Authz, monkeypatch: pytest.MonkeyPatch
) -> None:
    # No key configured server-side ⇒ the route is disabled, never open (fail-closed).
    from app.api import internal_auth

    monkeypatch.setattr(
        internal_auth, "get_settings", lambda: SimpleNamespace(internal_api_key="")
    )
    with _client(pg_session, test_authz) as client:
        assert client.get(_URL, headers={_HEADER: "anything"}).status_code == 503


def test_tenant_header_ignored_returns_global(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    # The dump is defined over the global catalog; a tenant header must not change it.
    m1 = _module("opd")
    pg_session.add(m1)
    pg_session.commit()
    with _client(pg_session, test_authz) as client:
        resp = client.get(_URL, headers={_HEADER: internal_key, "iq_tenant_id": _TENANT})
    assert resp.status_code == 200
    assert [row["id"] for row in resp.json()["data"]] == [str(m1.id)]


def test_malformed_tenant_header_is_structurally_ignored(
    pg_session: Session, test_authz: Authz, internal_key: str
) -> None:
    # The route uses get_global_module_repository (never get_catalog_scope), so it never parses the
    # tenant header — a malformed value returns the global catalog (200), NOT a 400. This locks the
    # header-ignored guarantee: a regression to the header-parsing get_catalog_scope would 400 here.
    m1 = _module("opd")
    pg_session.add(m1)
    pg_session.commit()
    with _client(pg_session, test_authz) as client:
        resp = client.get(_URL, headers={_HEADER: internal_key, "iq_tenant_id": "not-a-uuid"})
    assert resp.status_code == 200
    assert [row["id"] for row in resp.json()["data"]] == [str(m1.id)]

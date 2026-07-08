"""Full HTTP CRUD against the REAL ``DepartmentRepository`` + in-memory SQLite.

Previously this file injected a hand-written ``FakeDepartmentRepository`` (an
in-memory list that re-implemented the real repo's flush side-effects), so the
whole Departments router had zero persistence coverage — a broken repository
would have stayed green. This exercises the real repository, the real partial-unique
index (409 on duplicate active code), and the real not-found paths, matching the
other five catalogs' ``*_crud_integration`` suites.
"""

from __future__ import annotations

from collections.abc import Generator, Iterator
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from hims_authz import Authz
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_department_repository, get_session
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.repositories.department_repository import DepartmentRepository

_MISSING_ID = "00000000-0000-4000-8000-0000000000ff"
_DEPARTMENTS = "/api/v1/master-data/departments"


@pytest.fixture()
def department_sqlite_session() -> Iterator[Session]:
    # StaticPool: one DB connection shared by test thread and TestClient worker thread.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_tenant")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS master_global")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def department_client(
    department_sqlite_session: Session,
    test_authz: Authz,
    auth_headers: dict[str, str],
) -> Iterator[TestClient]:
    app = create_app(deps={"authz": test_authz})

    def _session() -> Generator[Session, None, None]:
        yield department_sqlite_session

    def _repo() -> DepartmentRepository:
        # Global scope (iq_tenant_id=None) → the GLOBAL departments model + its
        # `departments_code_active_key` partial-unique index.
        return DepartmentRepository(department_sqlite_session, CatalogScope(iq_tenant_id=None))

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_department_repository] = _repo
    with TestClient(app, headers=auth_headers) as client:
        yield client
    app.dependency_overrides.clear()


def _create_json(name: str, code: str, **extra: object) -> dict:
    body: dict = {"name": name, "code": code, "type": "clinical", "description": "d"}
    body.update(extra)
    return body


def test_department_crud_lifecycle(department_client: TestClient, actor_sub: str) -> None:
    r = department_client.post(_DEPARTMENTS, json=_create_json("Cardiology", "CARD"))
    assert r.status_code == 201, r.text
    body = r.json()["data"]
    assert body["code"] == "card"  # persisted normalized (lowercased) by the real repo
    assert body["created_by"] == actor_sub  # verified token sub, not a header
    did = UUID(body["id"])

    lst = department_client.get(_DEPARTMENTS)
    assert lst.status_code == 200
    assert lst.json()["total"] == 1  # the real row is actually in the DB

    g = department_client.get(f"{_DEPARTMENTS}/{did}")
    assert g.status_code == 200
    assert g.json()["data"]["code"] == "card"

    p = department_client.patch(f"{_DEPARTMENTS}/{did}", json={"name": "Cardiac Sciences"})
    assert p.status_code == 200, p.text
    assert p.json()["data"]["name"] == "Cardiac Sciences"
    assert p.json()["data"]["updated_by"] == actor_sub

    d = department_client.delete(f"{_DEPARTMENTS}/{did}")
    assert d.status_code in (200, 204), d.text
    # soft-deleted → no longer listed
    assert department_client.get(_DEPARTMENTS).json()["total"] == 0


def test_duplicate_active_code_conflicts(department_client: TestClient) -> None:
    first = department_client.post(_DEPARTMENTS, json=_create_json("Cardiology", "CARD"))
    assert first.status_code == 201, first.text
    dup = department_client.post(_DEPARTMENTS, json=_create_json("Cardio Two", "CARD"))
    assert dup.status_code == 409, dup.text  # real partial-unique index fires


def test_get_missing_department_404(department_client: TestClient) -> None:
    assert department_client.get(f"{_DEPARTMENTS}/{_MISSING_ID}").status_code == 404


def test_delete_missing_department_404(department_client: TestClient) -> None:
    assert department_client.delete(f"{_DEPARTMENTS}/{_MISSING_ID}").status_code == 404

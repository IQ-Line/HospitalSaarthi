"""HTTP CRUD tests for system role template endpoints."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import (
    get_picklist_repository,
    get_session,
    get_system_role_repository,
)
from app.core.catalog_scope import CatalogScope
from app.main import create_app
from app.models import Base
from app.models.picklist import PicklistModel, PicklistValueModel
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.system_role_repository import SystemRoleRepository

TENANT_ID = "550e8400-e29b-41d4-a716-446655440099"


@pytest.fixture()
def system_role_sqlite_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS tenant_master")
        dbapi_connection.execute("ATTACH DATABASE ':memory:' AS global_master")

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _override_catalog_deps(
    app,
    session: Session,
    *,
    iq_tenant_id: UUID | None = None,
) -> None:
    scope = CatalogScope(iq_tenant_id=iq_tenant_id)

    def _session() -> Iterator[Session]:
        yield session

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_picklist_repository] = lambda: PicklistRepository(session)
    app.dependency_overrides[get_system_role_repository] = lambda: SystemRoleRepository(
        session,
        scope,
    )


@pytest.fixture()
def system_role_client(system_role_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()
    _override_catalog_deps(app, system_role_sqlite_session)
    _seed_role_types_picklist(system_role_sqlite_session)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def tenant_system_role_client(system_role_sqlite_session: Session) -> Iterator[TestClient]:
    app = create_app()
    _override_catalog_deps(
        app,
        system_role_sqlite_session,
        iq_tenant_id=UUID(TENANT_ID),
    )
    _seed_role_types_picklist(system_role_sqlite_session)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _seed_role_types_picklist(session: Session) -> None:
    picklist = PicklistModel(
        name="Role Types",
        slug="role-types",
        is_active=True,
        is_deleted=False,
    )
    session.add(picklist)
    session.flush()
    session.add_all(
        [
            PicklistValueModel(
                category_id=picklist.id,
                value="nurse",
                label="Nurse",
                display_order=1,
                is_active=True,
                is_default=False,
            ),
            PicklistValueModel(
                category_id=picklist.id,
                value="doctor",
                label="Doctor",
                display_order=2,
                is_active=True,
                is_default=False,
            ),
        ],
    )
    session.commit()


def _create_body(name: str, slug: str, **extra: object) -> dict:
    body: dict = {
        "name": name,
        "slug": slug,
        "description": "d",
        "role_type": "nurse",
        "is_template": True,
        "is_active": True,
    }
    body.update(extra)
    return body


def test_system_role_crud_lifecycle(system_role_client: TestClient) -> None:
    created = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Ward Clerk", "ward-clerk"),
    )
    assert created.status_code == 201
    rid = UUID(created.json()["data"]["id"])
    assert created.json()["data"]["role_type"] == "nurse"

    listed = system_role_client.get("/api/v1/master-data/system-roles")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    by_slug = system_role_client.get("/api/v1/master-data/system-roles/by-slug/ward-clerk")
    assert by_slug.status_code == 200
    assert by_slug.json()["data"]["name"] == "Ward Clerk"

    patched = system_role_client.patch(
        f"/api/v1/master-data/system-roles/{rid}",
        json={"description": "updated"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["description"] == "updated"

    deleted = system_role_client.delete(f"/api/v1/master-data/system-roles/{rid}")
    assert deleted.status_code == 200
    assert deleted.json()["data"]["is_deleted"] is True

    assert system_role_client.get(f"/api/v1/master-data/system-roles/{rid}").status_code == 404
    missing_slug = system_role_client.get(
        "/api/v1/master-data/system-roles/by-slug/ward-clerk",
    )
    assert missing_slug.status_code == 404


def test_system_role_rejects_invalid_role_type(system_role_client: TestClient) -> None:
    created = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Bad Role", "bad-role", role_type="whatever"),
    )
    assert created.status_code == 400

    role = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Valid Role", "valid-role"),
    )
    assert role.status_code == 201
    role_id = role.json()["data"]["id"]

    patched = system_role_client.patch(
        f"/api/v1/master-data/system-roles/{role_id}",
        json={"role_type": "not-a-picklist-value"},
    )
    assert patched.status_code == 400


def test_tenant_scoped_system_role_create(tenant_system_role_client: TestClient) -> None:
    created = tenant_system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Tenant Nurse", "tenant-nurse"),
    )
    assert created.status_code == 201
    assert created.json()["data"]["iq_tenant_id"] == TENANT_ID
    assert created.json()["data"]["role_type"] == "nurse"


def test_system_role_slug_conflict_and_filter(system_role_client: TestClient) -> None:
    a = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role A", "same-slug"),
    )
    assert a.status_code == 201
    b = system_role_client.post(
        "/api/v1/master-data/system-roles",
        json=_create_body("Role B", "same-slug"),
    )
    assert b.status_code == 409

    filtered = system_role_client.get("/api/v1/master-data/system-roles?is_template=true")
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1


def test_system_role_not_found_routes(system_role_client: TestClient) -> None:
    assert (
        system_role_client.get(f"/api/v1/master-data/system-roles/{uuid4()}").status_code == 404
    )
    assert (
        system_role_client.patch(
            f"/api/v1/master-data/system-roles/{uuid4()}",
            json={"name": "x"},
        ).status_code
        == 404
    )
    assert (
        system_role_client.delete(f"/api/v1/master-data/system-roles/{uuid4()}").status_code
        == 404
    )

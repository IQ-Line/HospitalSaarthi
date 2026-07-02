from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient
from hims_authz import Authz

from app.api.deps import get_department_repository
from app.core.catalog_scope import CatalogScope
from app.main import create_app


def _sample_department_row(**overrides):
    now = datetime.now(UTC)
    defaults = dict(
        id=uuid4(),
        name="General Medicine",
        code="gen-med",
        type="clinical",
        description="OPD general medicine",
        is_active=True,
        is_deleted=False,
        created_by=None,
        updated_by=None,
        created_at=now,
        updated_at=now,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class FakeDepartmentRepository:
    scope = CatalogScope(iq_tenant_id=None)

    def __init__(self) -> None:
        self._rows = [_sample_department_row()]

    def list_departments(
        self,
        *,
        search=None,
        department_type=None,
        limit=50,
        offset=0,
    ):
        rows = self._rows
        if department_type is not None:
            rows = [r for r in rows if r.type == department_type.value]
        if search:
            term = search.strip().lower()
            rows = [
                r
                for r in rows
                if term in r.name.lower() or term in r.code.lower() or term in r.type.lower()
            ]
        total = len(rows)
        page = rows[offset : offset + limit]
        return page, total

    def create_department(self, department):
        # Mirror what the real repo's flush does: populate the columns whose
        # values are DB/ORM-generated on insert (id, is_deleted, timestamps), so
        # the response model can validate the returned row.
        now = datetime.now(UTC)
        if getattr(department, "id", None) is None:
            department.id = uuid4()
        if getattr(department, "is_deleted", None) is None:
            department.is_deleted = False
        if getattr(department, "created_at", None) is None:
            department.created_at = now
        if getattr(department, "updated_at", None) is None:
            department.updated_at = now
        self._rows.append(department)
        return department


def test_get_departments_returns_list(
    test_authz: Authz, auth_headers: dict[str, str]
) -> None:
    app = create_app(deps={"authz": test_authz})
    app.dependency_overrides[get_department_repository] = lambda: FakeDepartmentRepository()

    response = TestClient(app, headers=auth_headers).get("/api/v1/master-data/departments")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["data"][0]["code"] == "gen-med"
    assert body["data"][0]["type"] == "clinical"


def test_post_department_creates_row(
    test_authz: Authz, auth_headers: dict[str, str]
) -> None:
    app = create_app(deps={"authz": test_authz})
    repo = FakeDepartmentRepository()
    app.dependency_overrides[get_department_repository] = lambda: repo

    response = TestClient(app, headers=auth_headers).post(
        "/api/v1/master-data/departments",
        json={
            "name": "Cardiology",
            "code": "CARD",
            "type": "clinical",
            "description": "Heart centre",
        },
    )

    assert response.status_code == 201
    body = response.json()["data"]
    assert body["name"] == "Cardiology"
    assert body["code"] == "card"
    assert len(repo._rows) == 2

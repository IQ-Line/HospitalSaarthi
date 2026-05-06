from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_module_repository
from app.main import create_app


def _sample_module_row(**overrides):
    now = datetime.now(UTC)
    defaults = dict(
        id=uuid4(),
        parent_id=None,
        name="master_data",
        slug="master-data",
        description=None,
        category="core",
        version="1.0.0",
        level=1,
        icon=None,
        is_active=True,
        is_deleted=False,
        created_by=None,
        updated_by=None,
        created_at=now,
        updated_at=now,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class FakeModuleRepository:
    def list_modules(self, *, category=None):
        return [_sample_module_row()]

    def get_module_by_id(self, module_id: UUID, *, include_deleted: bool = False):
        row = _sample_module_row()
        return row if row.id == module_id else None

    def get_module_by_slug(self, slug: str):
        row = _sample_module_row()
        return row if row.slug == slug else None


def test_get_meta_returns_service_stamp() -> None:
    app = create_app()
    response = TestClient(app).get("/api/v1/master-data/meta")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "hims-master-data"
    assert body["api_prefix"] == "/api/v1/master-data"


def test_get_modules_returns_module_list() -> None:
    app = create_app()
    app.dependency_overrides[get_module_repository] = lambda: FakeModuleRepository()

    response = TestClient(app).get("/api/v1/master-data/modules")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["data"][0]["name"] == "master_data"
    assert body["data"][0]["slug"] == "master-data"
    assert body["data"][0]["category"] == "core"
    assert body["data"][0]["level"] == 1
    assert body["data"][0]["is_active"] is True
    assert body["data"][0]["is_deleted"] is False


def test_get_module_by_id_returns_wrapped_module() -> None:
    app = create_app()
    fixed_id = UUID("11111111-1111-4111-8111-111111111111")

    class Repo(FakeModuleRepository):
        def get_module_by_id(self, module_id: UUID):
            return _sample_module_row(id=fixed_id) if module_id == fixed_id else None

    app.dependency_overrides[get_module_repository] = lambda: Repo()

    response = TestClient(app).get(f"/api/v1/master-data/modules/{fixed_id}")
    assert response.status_code == 200
    assert response.json()["data"]["slug"] == "master-data"


def test_get_module_by_slug_returns_wrapped_module() -> None:
    app = create_app()
    app.dependency_overrides[get_module_repository] = lambda: FakeModuleRepository()

    response = TestClient(app).get("/api/v1/master-data/modules/by-slug/master-data")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "master_data"


def test_get_module_by_id_404_uses_error_envelope() -> None:
    app = create_app()

    class EmptyRepo(FakeModuleRepository):
        def get_module_by_id(self, module_id: UUID, *, include_deleted: bool = False):
            return None

    app.dependency_overrides[get_module_repository] = lambda: EmptyRepo()

    response = TestClient(app).get(f"/api/v1/master-data/modules/{uuid4()}")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


def test_post_module_201_with_fake_repository() -> None:
    fixed_id = UUID("aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee")

    class CreatingRepo(FakeModuleRepository):
        def create_module(self, module):
            return _sample_module_row(id=fixed_id, name=module.name, slug=module.slug)

    app = create_app()
    app.dependency_overrides[get_module_repository] = lambda: CreatingRepo()

    response = TestClient(app).post(
        "/api/v1/master-data/modules",
        json={
            "name": "new_mod",
            "slug": "new-mod",
            "category": "clinical",
            "version": "1.0.0",
        },
    )
    assert response.status_code == 201
    assert response.json()["data"]["id"] == str(fixed_id)
    assert response.json()["data"]["name"] == "new_mod"

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_module_repository
from app.main import create_app


class FakeModuleRepository:
    def list_modules(self, *, category=None, is_core=None):
        now = datetime.now(UTC)
        return [
            SimpleNamespace(
                id=uuid4(),
                name="master_data",
                display_name="Master Data",
                category="core",
                is_core=True,
                version="1.0.0",
                created_at=now,
                updated_at=now,
            )
        ]


def test_get_modules_returns_module_list() -> None:
    app = create_app()
    app.dependency_overrides[get_module_repository] = lambda: FakeModuleRepository()

    response = TestClient(app).get("/api/master-data/modules")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["data"][0]["name"] == "master_data"
    assert body["data"][0]["category"] == "core"

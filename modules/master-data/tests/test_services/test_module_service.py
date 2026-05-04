from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from app.schemas.module import ModuleCategory
from app.services.module_service import list_modules


class FakeModuleRepository:
    def __init__(self) -> None:
        self.last_category: ModuleCategory | None = None
        self.last_is_core: bool | None = None

    def list_modules(
        self,
        *,
        category: ModuleCategory | None = None,
        is_core: bool | None = None,
    ):
        self.last_category = category
        self.last_is_core = is_core
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


def test_list_modules_delegates_filters_to_repository() -> None:
    repository = FakeModuleRepository()

    modules = list_modules(repository, category=ModuleCategory.core, is_core=True)

    assert len(modules) == 1
    assert modules[0].name == "master_data"
    assert repository.last_category == ModuleCategory.core
    assert repository.last_is_core is True

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

from app.schemas.module import ModuleCategory, ModuleKind
from app.services.module_service import get_module_by_id, get_module_by_slug, list_modules


def _row():
    now = datetime.now(UTC)
    return SimpleNamespace(
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
        module_kind="product",
        display_order=0,
        created_by=None,
        updated_by=None,
        created_at=now,
        updated_at=now,
    )


class FakeModuleRepository:
    def __init__(self) -> None:
        self.last_category: ModuleCategory | None = None

    def list_modules(self, *, category: ModuleCategory | None = None, module_kinds: list[ModuleKind] | None = None):
        self.last_category = category
        return [_row()]

    def get_module_by_id(self, module_id: UUID):
        r = _row()
        return r if r.id == module_id else None

    def get_module_by_slug(self, slug: str):
        r = _row()
        return r if r.slug == slug else None


def test_list_modules_delegates_filters_to_repository() -> None:
    repository = FakeModuleRepository()

    modules = list_modules(repository, category=ModuleCategory.core)

    assert len(modules) == 1
    assert modules[0].name == "master_data"
    assert repository.last_category == ModuleCategory.core


def test_get_module_by_id() -> None:
    target = _row()

    class ByIdRepo(FakeModuleRepository):
        def get_module_by_id(self, module_id: UUID):
            return target if module_id == target.id else None

    repository = ByIdRepo()

    assert get_module_by_id(repository, target.id) == target
    assert get_module_by_id(repository, uuid4()) is None


def test_get_module_by_slug() -> None:
    repository = FakeModuleRepository()
    assert get_module_by_slug(repository, "master-data") is not None
    assert get_module_by_slug(repository, "missing") is None

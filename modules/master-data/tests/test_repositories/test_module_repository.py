from uuid import uuid4

from app.models.module import ModuleModel
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCategory


def test_module_repository_lists_modules_with_category_filter(sqlite_session) -> None:
    sqlite_session.add_all(
        [
            ModuleModel(
                name="master_data",
                slug="master-data",
                category="core",
                version="1.0.0",
            ),
            ModuleModel(
                name="opd",
                slug="opd",
                category="clinical",
                version="1.0.0",
            ),
        ]
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)

    modules = repository.list_modules(category=ModuleCategory.core)

    assert [module.name for module in modules] == ["master_data"]


def test_module_repository_excludes_soft_deleted_from_list(sqlite_session) -> None:
    sqlite_session.add_all(
        [
            ModuleModel(
                name="active_mod",
                slug="active-mod",
                category="core",
                version="1.0.0",
            ),
            ModuleModel(
                name="retired_mod",
                slug="retired-mod",
                category="core",
                version="1.0.0",
                is_deleted=True,
            ),
        ]
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)
    modules = repository.list_modules()

    assert [m.name for m in modules] == ["active_mod"]


def test_module_repository_get_by_id_returns_none_when_soft_deleted(sqlite_session) -> None:
    module_id = uuid4()
    sqlite_session.add(
        ModuleModel(
            id=module_id,
            name="gone",
            slug="gone",
            category="core",
            version="1.0.0",
            is_deleted=True,
        )
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)
    assert repository.get_module_by_id(module_id) is None


def test_module_repository_get_by_slug_returns_none_when_soft_deleted(sqlite_session) -> None:
    sqlite_session.add(
        ModuleModel(
            name="gone",
            slug="gone-slug",
            category="core",
            version="1.0.0",
            is_deleted=True,
        )
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)
    assert repository.get_module_by_slug("gone-slug") is None


def test_slug_can_repeat_after_soft_delete(sqlite_session) -> None:
    """Partial unique on slug allows reuse once prior row is soft-deleted."""
    sqlite_session.add(
        ModuleModel(
            name="retired",
            slug="shared-slug",
            category="core",
            version="1.0.0",
            is_deleted=True,
        )
    )
    sqlite_session.commit()
    sqlite_session.add(
        ModuleModel(
            name="replacement",
            slug="shared-slug",
            category="clinical",
            version="2.0.0",
        )
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)
    assert repository.get_module_by_slug("shared-slug").name == "replacement"

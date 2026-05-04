from app.models.module import ModuleModel
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCategory


def test_module_repository_lists_modules_with_filters(sqlite_session) -> None:
    sqlite_session.add_all(
        [
            ModuleModel(
                name="master_data",
                display_name="Master Data",
                category="core",
                is_core=True,
                version="1.0.0",
            ),
            ModuleModel(
                name="opd",
                display_name="OPD",
                category="clinical",
                is_core=False,
                version="1.0.0",
            ),
        ]
    )
    sqlite_session.commit()

    repository = ModuleRepository(sqlite_session)

    modules = repository.list_modules(category=ModuleCategory.core, is_core=True)

    assert [module.name for module in modules] == ["master_data"]

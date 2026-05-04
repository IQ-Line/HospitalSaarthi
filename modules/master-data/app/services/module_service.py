from typing import Protocol

from app.models.module import ModuleModel
from app.schemas.module import ModuleCategory


class ModuleReader(Protocol):
    def list_modules(
        self,
        *,
        category: ModuleCategory | None = None,
        is_core: bool | None = None,
    ) -> list[ModuleModel]: ...


def list_modules(
    repository: ModuleReader,
    *,
    category: ModuleCategory | None = None,
    is_core: bool | None = None,
) -> list[ModuleModel]:
    return repository.list_modules(category=category, is_core=is_core)

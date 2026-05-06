"""Use-cases for the module catalog (thin orchestration over repositories)."""

from typing import Protocol
from uuid import UUID

from app.models.module import ModuleModel
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCategory, ModuleCreate, ModuleUpdate


class ModuleReader(Protocol):
    def list_modules(self, *, category: ModuleCategory | None = None) -> list[ModuleModel]: ...

    def get_module_by_id(
        self,
        module_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> ModuleModel | None: ...

    def get_module_by_slug(self, slug: str) -> ModuleModel | None: ...


class ParentModuleNotFoundError(Exception):
    """Referenced parent row is missing or soft-deleted."""


class MaxTreeDepthError(Exception):
    """Cannot add or move under a parent at level 4."""


class ModuleNotFoundError(Exception):
    """No row for id (or reader-visible semantics)."""


class InvalidParentCycleError(Exception):
    """Assigning parent_id would create a cycle in the module tree."""


def list_modules(
    repository: ModuleReader,
    *,
    category: ModuleCategory | None = None,
) -> list[ModuleModel]:
    return repository.list_modules(category=category)


def get_module_by_id(repository: ModuleReader, module_id: UUID) -> ModuleModel | None:
    return repository.get_module_by_id(module_id)


def get_module_by_slug(repository: ModuleReader, slug: str) -> ModuleModel | None:
    return repository.get_module_by_slug(slug)


def _would_create_cycle(
    repository: ModuleRepository,
    module_id: UUID,
    new_parent_id: UUID | None,
) -> bool:
    if new_parent_id is None:
        return False
    current: UUID | None = new_parent_id
    seen: set[UUID] = set()
    while current is not None:
        if current == module_id:
            return True
        if current in seen:
            return True
        seen.add(current)
        row = repository.get_module_by_id(current, include_deleted=True)
        if row is None:
            break
        current = row.parent_id
    return False


def create_module(
    repository: ModuleRepository,
    payload: ModuleCreate,
    *,
    actor_id: UUID | None,
) -> ModuleModel:
    parent_id = payload.parent_id
    level = 1 if payload.level is None else payload.level

    if parent_id is not None:
        parent = repository.get_module_by_id(parent_id)
        if parent is None:
            raise ParentModuleNotFoundError
        if parent.level >= 4:
            raise MaxTreeDepthError
        level = parent.level + 1
    elif payload.level is not None:
        level = payload.level

    module = ModuleModel(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        category=payload.category.value,
        version=payload.version,
        level=level,
        parent_id=parent_id,
        icon=payload.icon,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    return repository.create_module(module)


def update_module(
    repository: ModuleRepository,
    module_id: UUID,
    payload: ModuleUpdate,
    *,
    actor_id: UUID | None,
) -> ModuleModel:
    module = repository.get_module_by_id(module_id, include_deleted=True)
    if module is None:
        raise ModuleNotFoundError

    data = payload.model_dump(exclude_unset=True)

    if "parent_id" in data:
        new_parent_id = data["parent_id"]
        if new_parent_id is not None:
            parent = repository.get_module_by_id(new_parent_id)
            if parent is None:
                raise ParentModuleNotFoundError
            if parent.level >= 4:
                raise MaxTreeDepthError
            if _would_create_cycle(repository, module_id, new_parent_id):
                raise InvalidParentCycleError
            module.parent_id = new_parent_id
            module.level = parent.level + 1
        else:
            module.parent_id = None
            if "level" in data:
                module.level = data["level"]
            else:
                module.level = 1

    if "level" in data and "parent_id" not in data:
        module.level = data["level"]

    if "name" in data:
        module.name = data["name"]
    if "slug" in data:
        module.slug = data["slug"]
    if "description" in data:
        module.description = data["description"]
    if "category" in data:
        raw = data["category"]
        module.category = raw.value if hasattr(raw, "value") else raw
    if "version" in data:
        module.version = data["version"]
    if "icon" in data:
        module.icon = data["icon"]
    if "is_active" in data:
        module.is_active = data["is_active"]
    if "is_deleted" in data:
        module.is_deleted = data["is_deleted"]

    module.updated_by = actor_id
    return repository.update_module(module)


def soft_delete_module(
    repository: ModuleRepository,
    module_id: UUID,
    *,
    actor_id: UUID | None,
) -> ModuleModel:
    module = repository.get_module_by_id(module_id, include_deleted=True)
    if module is None:
        raise ModuleNotFoundError
    if module.is_deleted:
        return module
    module.is_deleted = True
    module.updated_by = actor_id
    return repository.update_module(module)

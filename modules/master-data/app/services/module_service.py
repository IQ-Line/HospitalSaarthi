"""Use-cases for the module catalog (thin orchestration over repositories)."""

from __future__ import annotations

from typing import Any, Protocol
from uuid import UUID

from app.catalog.platform_table_models import module_model
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCategory, ModuleCreate, ModuleKind, ModuleUpdate, VisibilityScope

# Deepest allowed stored ``level`` (root = 1). Raise migration + model check if this changes.
MAX_MODULE_TREE_LEVEL = 10


class ModuleReader(Protocol):
    def list_modules(
        self,
        *,
        category: ModuleCategory | None = None,
        module_kinds: list[ModuleKind] | None = None,
        visibility: VisibilityScope | None = None,
    ) -> list[Any]: ...

    def get_module_by_id(
        self,
        module_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None: ...

    def get_module_by_slug(self, slug: str) -> Any | None: ...


class ParentModuleNotFoundError(Exception):
    """Referenced parent row is missing or soft-deleted."""


class MaxTreeDepthError(Exception):
    """Cannot add or move under a parent that is already at ``MAX_MODULE_TREE_LEVEL``."""


class ModuleNotFoundError(Exception):
    """No row for id (or reader-visible semantics)."""


class InvalidParentCycleError(Exception):
    """Assigning parent_id would create a cycle in the module tree."""


def list_modules(
    repository: ModuleReader,
    *,
    category: ModuleCategory | None = None,
    module_kinds: list[ModuleKind] | None = None,
    visibility: VisibilityScope | None = None,
) -> list[Any]:
    return repository.list_modules(category=category, module_kinds=module_kinds, visibility=visibility)


def list_modules_for_nav(
    repository: ModuleRepository,
    *,
    visibility: VisibilityScope | None = None,
) -> list[Any]:
    """Return all active, non-deleted modules for shell navigation (no pagination)."""
    return repository.list_modules_for_nav(visibility=visibility)


def list_submodules(repository: ModuleRepository, parent_id: UUID) -> list[Any]:
    """Return **all** active rows directly under ``parent_id`` (full list; no pagination).

    Raises ``ModuleNotFoundError`` if the parent id is missing or soft-deleted.
    """
    if repository.get_module_by_id(parent_id) is None:
        raise ModuleNotFoundError
    return repository.list_modules_by_parent_id(parent_id)


def get_module_by_id(repository: ModuleReader, module_id: UUID) -> Any | None:
    return repository.get_module_by_id(module_id)


def get_module_by_slug(repository: ModuleReader, slug: str) -> Any | None:
    return repository.get_module_by_slug(slug)


def _level_from_parent_id(repository: ModuleRepository, parent_id: UUID | None) -> int:
    """Tree depth: root ``parent_id is None`` → 1; else ``parent.level + 1`` (parent must exist)."""
    if parent_id is None:
        return 1
    parent = repository.get_module_by_id(parent_id)
    if parent is None:
        raise ParentModuleNotFoundError
    return parent.level + 1


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


def _kind_from_parent(repository: ModuleRepository, parent_id: UUID | None, fallback: str) -> str:
    """Children inherit ``module_kind`` from their parent; root modules use the payload value."""
    if parent_id is None:
        return fallback
    parent = repository.get_module_by_id(parent_id, include_deleted=True)
    if parent is None:
        return fallback
    return parent.module_kind


def create_module(
    repository: ModuleRepository,
    payload: ModuleCreate,
    *,
    actor_id: UUID | None,
) -> Any:
    """Persist ``level`` only from the tree: root → 1, child → ``parent.level + 1``."""
    parent_id = payload.parent_id

    if parent_id is not None:
        parent = repository.get_module_by_id(parent_id)
        if parent is None:
            raise ParentModuleNotFoundError
        if parent.level >= MAX_MODULE_TREE_LEVEL:
            raise MaxTreeDepthError
        level = parent.level + 1
    else:
        level = 1

    module_kind = _kind_from_parent(repository, parent_id, payload.module_kind.value)

    M = module_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        category=payload.category.value,
        version=payload.version,
        level=level,
        module_kind=module_kind,
        display_order=payload.display_order,
        parent_id=parent_id,
        icon=payload.icon,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["iq_tenant_id"] = repository.scope.iq_tenant_id
    module = M(**kwargs)
    return repository.create_module(module)


def update_module(
    repository: ModuleRepository,
    module_id: UUID,
    payload: ModuleUpdate,
    *,
    actor_id: UUID | None,
) -> Any:
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
            if parent.level >= MAX_MODULE_TREE_LEVEL:
                raise MaxTreeDepthError
            if _would_create_cycle(repository, module_id, new_parent_id):
                raise InvalidParentCycleError
            module.parent_id = new_parent_id
        else:
            module.parent_id = None

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
    if "display_order" in data:
        module.display_order = data["display_order"]
    if "is_active" in data:
        module.is_active = data["is_active"]
    if "is_deleted" in data:
        module.is_deleted = data["is_deleted"]

    # ``level`` always follows ``parent_id`` (ignore a bare ``level`` that disagrees with the tree).
    module.level = _level_from_parent_id(repository, module.parent_id)
    # ``module_kind`` re-derived on parent change, same as ``level``.
    module.module_kind = _kind_from_parent(repository, module.parent_id, module.module_kind)

    module.updated_by = actor_id
    return repository.update_module(module)


def soft_delete_module(
    repository: ModuleRepository,
    module_id: UUID,
    *,
    actor_id: UUID | None,
) -> Any:
    """Soft-delete target module and all active descendants (recursive cascade)."""
    module = repository.get_module_by_id(module_id, include_deleted=True)
    if module is None:
        raise ModuleNotFoundError
    if module.is_deleted:
        return module
    module.is_deleted = True
    module.updated_by = actor_id
    repository.update_module(module)

    # Cascade soft-delete to descendants so no active rows keep parent_id pointing
    # to a soft-deleted ancestor.
    queue: list[UUID] = [module.id]
    while queue:
        parent_id = queue.pop(0)
        children = repository.list_modules_by_parent_id(parent_id)
        for child in children:
            if child.is_deleted:
                continue
            child.is_deleted = True
            child.updated_by = actor_id
            repository.update_module(child)
            queue.append(child.id)

    return module

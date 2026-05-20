"""Use-cases for the module catalog (thin orchestration over repositories)."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Protocol
from uuid import UUID

from app.catalog.platform_table_models import module_model
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import (
    ModuleCategory,
    ModuleCreate,
    ModuleNavPermissionBundle,
    ModuleNavTreeNode,
    ModuleUpdate,
    ModuleNavResponse,
    NavModulePermissionLink,
)

# Deepest allowed stored ``level`` (root = 1). Raise migration + model check if this changes.
MAX_MODULE_TREE_LEVEL = 10


class ModuleReader(Protocol):
    def list_modules(self, *, category: ModuleCategory | None = None) -> list[Any]: ...

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
) -> list[Any]:
    return repository.list_modules(category=category)


def list_modules_for_nav(repository: ModuleRepository) -> list[Any]:
    """Return all active, non-deleted modules for shell navigation (no pagination)."""
    return repository.list_modules_for_nav()


def build_module_nav_tree_with_permissions(
    modules: list[Any],
    permission_rows: list[tuple[Any, Any]],
) -> list[ModuleNavTreeNode]:
    """Build a parent/child tree; attach junction links to modules that have them."""
    permissions_by_module: dict[UUID, list[NavModulePermissionLink]] = {}
    for mp_row, perm_row in permission_rows:
        link = NavModulePermissionLink(
            id=mp_row.id,
            permission_id=perm_row.id,
            permission_slug=perm_row.slug,
            permission_name=perm_row.name,
            action=perm_row.action,
        )
        permissions_by_module.setdefault(mp_row.module_id, []).append(link)

    for links in permissions_by_module.values():
        links.sort(key=lambda row: row.permission_slug)

    children_by_parent: dict[UUID | None, list[Any]] = {}
    for module in modules:
        children_by_parent.setdefault(module.parent_id, []).append(module)

    def to_node(module: Any) -> ModuleNavTreeNode:
        child_modules = children_by_parent.get(module.id, [])
        return ModuleNavTreeNode(
            id=module.id,
            iq_tenant_id=getattr(module, "iq_tenant_id", None),
            parent_id=module.parent_id,
            name=module.name,
            slug=module.slug,
            category=ModuleCategory(module.category),
            level=module.level,
            icon=module.icon,
            permissions=permissions_by_module.get(module.id, []),
            children=[to_node(child) for child in child_modules],
        )

    roots = children_by_parent.get(None, [])
    return [to_node(root) for root in roots]


def list_module_nav_permission_links(
    mp_repository: ModulePermissionRepository,
    module_repository: ModuleRepository,
    module_id: UUID,
) -> tuple[Any, list[NavModulePermissionLink]]:
    """Return module nav row and junction links; module must exist in the same catalog scope."""
    module = module_repository.get_module_by_id(module_id)
    if module is None:
        raise ModuleNotFoundError
    rows = mp_repository.list_active_permissions_for_module_with_details(module_id)
    links = [
        NavModulePermissionLink(
            id=mp_row.id,
            permission_id=perm_row.id,
            permission_slug=perm_row.slug,
            permission_name=perm_row.name,
            action=perm_row.action,
        )
        for mp_row, perm_row in rows
    ]
    links.sort(key=lambda row: row.permission_slug)
    return module, links


def list_module_nav_permissions_batch(
    mp_repository: ModulePermissionRepository,
    module_repository: ModuleRepository,
    module_ids: list[UUID],
) -> list[ModuleNavPermissionBundle]:
    """Return module nav rows and junction links for many modules (platform catalog)."""
    if not module_ids:
        return []

    rows = mp_repository.list_active_permissions_for_modules_with_details(module_ids)
    links_by_module: dict[UUID, list[NavModulePermissionLink]] = defaultdict(list)
    for mp_row, perm_row in rows:
        links_by_module[mp_row.module_id].append(
            NavModulePermissionLink(
                id=mp_row.id,
                permission_id=perm_row.id,
                permission_slug=perm_row.slug,
                permission_name=perm_row.name,
                action=perm_row.action,
            )
        )

    bundles: list[ModuleNavPermissionBundle] = []
    for module_id in module_ids:
        module = module_repository.get_module_by_id(module_id)
        if module is None:
            continue
        links = links_by_module.get(module_id, [])
        links.sort(key=lambda row: row.permission_slug)
        bundles.append(
            ModuleNavPermissionBundle(
                module=ModuleNavResponse.model_validate(module),
                permissions=links,
            )
        )
    return bundles


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

    M = module_model(repository.scope)
    kwargs: dict[str, Any] = dict(
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
    if "is_active" in data:
        module.is_active = data["is_active"]
    if "is_deleted" in data:
        module.is_deleted = data["is_deleted"]

    # ``level`` always follows ``parent_id`` (ignore a bare ``level`` that disagrees with the tree).
    module.level = _level_from_parent_id(repository, module.parent_id)

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

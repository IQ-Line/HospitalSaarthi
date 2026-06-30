"""Inventory — categories use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.inventory.table_models import inventory_category_model
from app.repositories.inventory.category import InventoryCategoryRepository
from app.schemas.inventory.category import InventoryCategoryCreate, InventoryCategoryUpdate
from app.services.inventory._errors import InvalidInventoryCatalogError


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_inventory_categories(
    repository: InventoryCategoryRepository,
    *,
    search: str | None,
    is_active: bool | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_rows(
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )


def _assert_valid_parent(
    repository: InventoryCategoryRepository,
    *,
    category_id: UUID | None,
    parent_category_id: UUID | None,
) -> None:
    if parent_category_id is None:
        return
    if category_id is not None and parent_category_id == category_id:
        raise InvalidInventoryCatalogError("Category cannot be its own parent.")
    parent = repository.get_by_id(parent_category_id)
    if parent is None:
        raise InvalidInventoryCatalogError("Parent category not found.")
    if parent.parent_category_id is not None:
        raise InvalidInventoryCatalogError(
            "Sub-categories can only be created under a top-level category.",
        )
    if category_id is not None:
        current: UUID | None = parent_category_id
        seen: set[UUID] = set()
        while current is not None:
            if current == category_id:
                raise InvalidInventoryCatalogError("Parent category would create a cycle.")
            if current in seen:
                break
            seen.add(current)
            row = repository.get_by_id(current)
            current = row.parent_category_id if row else None


def create_inventory_category(
    repository: InventoryCategoryRepository,
    *,
    payload: InventoryCategoryCreate,
) -> Any:
    _assert_valid_parent(
        repository,
        category_id=None,
        parent_category_id=payload.parent_category_id,
    )
    M = inventory_category_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        name=payload.name.strip(),
        parent_category_id=payload.parent_category_id,
        description=_norm_opt_str(payload.description),
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_inventory_category_by_id(
    repository: InventoryCategoryRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_inventory_category(
    repository: InventoryCategoryRepository,
    *,
    row_id: UUID,
    payload: InventoryCategoryUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "parent_category_id" in dump:
        _assert_valid_parent(
            repository,
            category_id=row_id,
            parent_category_id=payload.parent_category_id,
        )
    if "name" in dump and payload.name is not None:
        row.name = payload.name.strip()
    if "description" in dump:
        row.description = _norm_opt_str(payload.description)
    if "parent_category_id" in dump:
        row.parent_category_id = payload.parent_category_id
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_inventory_category(
    repository: InventoryCategoryRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

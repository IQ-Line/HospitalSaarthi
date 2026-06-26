"""Inventory — item types use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.inventory.table_models import inventory_item_type_model
from app.repositories.inventory.item_type import InventoryItemTypeRepository
from app.schemas.inventory.item_type import InventoryItemTypeCreate, InventoryItemTypeUpdate


def list_inventory_item_types(
    repository: InventoryItemTypeRepository,
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


def create_inventory_item_type(
    repository: InventoryItemTypeRepository,
    *,
    payload: InventoryItemTypeCreate,
) -> Any:
    M = inventory_item_type_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        name=payload.name.strip(),
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_inventory_item_type_by_id(
    repository: InventoryItemTypeRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_inventory_item_type(
    repository: InventoryItemTypeRepository,
    *,
    row_id: UUID,
    payload: InventoryItemTypeUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "name" in dump and payload.name is not None:
        row.name = payload.name.strip()
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_inventory_item_type(
    repository: InventoryItemTypeRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

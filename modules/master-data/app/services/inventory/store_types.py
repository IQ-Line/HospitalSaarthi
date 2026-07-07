"""Inventory — store types use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.inventory.table_models import inventory_store_type_model
from app.repositories.inventory.store_type import InventoryStoreTypeRepository
from app.schemas.inventory.store_type import InventoryStoreTypeCreate, InventoryStoreTypeUpdate


def list_inventory_store_types(
    repository: InventoryStoreTypeRepository,
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


def create_inventory_store_type(
    repository: InventoryStoreTypeRepository,
    *,
    payload: InventoryStoreTypeCreate,
) -> Any:
    M = inventory_store_type_model(repository.scope)
    code = payload.code.strip() if payload.code else repository.generate_next_code()
    common = dict(
        id=uuid.uuid4(),
        code=code,
        name=payload.name.strip(),
        description=(payload.description or "").strip(),
        can_receive_stock=payload.can_receive_stock,
        can_dispense=payload.can_dispense,
        can_issue_to_ward=payload.can_issue_to_ward,
        track_batch_expiry=payload.track_batch_expiry,
        indent_authority=payload.indent_authority,
        default_indent_target_store_id=payload.default_indent_target_store_id,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_inventory_store_type_by_id(
    repository: InventoryStoreTypeRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_inventory_store_type(
    repository: InventoryStoreTypeRepository,
    *,
    row_id: UUID,
    payload: InventoryStoreTypeUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "name" in dump and payload.name is not None:
        row.name = payload.name.strip()
    if "description" in dump and payload.description is not None:
        row.description = payload.description.strip()
    if "can_receive_stock" in dump and payload.can_receive_stock is not None:
        row.can_receive_stock = payload.can_receive_stock
    if "can_dispense" in dump and payload.can_dispense is not None:
        row.can_dispense = payload.can_dispense
    if "can_issue_to_ward" in dump and payload.can_issue_to_ward is not None:
        row.can_issue_to_ward = payload.can_issue_to_ward
    if "track_batch_expiry" in dump and payload.track_batch_expiry is not None:
        row.track_batch_expiry = payload.track_batch_expiry
    if "indent_authority" in dump and payload.indent_authority is not None:
        row.indent_authority = payload.indent_authority
    if "default_indent_target_store_id" in dump:
        row.default_indent_target_store_id = payload.default_indent_target_store_id
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_inventory_store_type(
    repository: InventoryStoreTypeRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

"""Inventory — HSN/GST use-cases."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any
from uuid import UUID

from app.catalog.inventory.table_models import inventory_hsn_gst_model
from app.repositories.inventory.hsn_gst import InventoryHsnGstRepository
from app.schemas.inventory.hsn_gst import InventoryHsnGstCreate, InventoryHsnGstUpdate
from app.services.inventory._errors import InvalidInventoryCatalogError


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_inventory_hsn_gst(
    repository: InventoryHsnGstRepository,
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


def create_inventory_hsn_gst(
    repository: InventoryHsnGstRepository,
    *,
    payload: InventoryHsnGstCreate,
) -> Any:
    if payload.effective_from < date.today():
        raise InvalidInventoryCatalogError("effective_from cannot be in the past.")
    M = inventory_hsn_gst_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        hsn_code=payload.hsn_code,
        effective_from=payload.effective_from,
        cgst_pct=payload.cgst_pct,
        sgst_pct=payload.sgst_pct,
        igst_pct=payload.igst_pct,
        supporting_document_url=_norm_opt_str(payload.supporting_document_url),
        remarks=_norm_opt_str(payload.remarks),
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_inventory_hsn_gst_by_id(
    repository: InventoryHsnGstRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_inventory_hsn_gst(
    repository: InventoryHsnGstRepository,
    *,
    row_id: UUID,
    payload: InventoryHsnGstUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "effective_from" in dump and payload.effective_from is not None:
        row.effective_from = payload.effective_from
    if all(k in dump for k in ("cgst_pct", "sgst_pct", "igst_pct")):
        row.cgst_pct = payload.cgst_pct  # type: ignore[assignment]
        row.sgst_pct = payload.sgst_pct  # type: ignore[assignment]
        row.igst_pct = payload.igst_pct  # type: ignore[assignment]
    if "supporting_document_url" in dump:
        row.supporting_document_url = _norm_opt_str(payload.supporting_document_url)
    if "remarks" in dump:
        row.remarks = _norm_opt_str(payload.remarks)
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_inventory_hsn_gst(
    repository: InventoryHsnGstRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

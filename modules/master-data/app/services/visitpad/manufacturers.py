"""Visitpad — manufacturers use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_manufacturer_model
from app.repositories.visitpad.manufacturer import VisitpadManufacturerRepository
from app.schemas.visitpad.manufacturer import VisitpadManufacturerCreate, VisitpadManufacturerUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_manufacturers(
    repository: VisitpadManufacturerRepository,
    *,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_manufacturers(search=search, limit=limit, offset=offset)


def create_visitpad_manufacturer(
    repository: VisitpadManufacturerRepository,
    *,
    payload: VisitpadManufacturerCreate,
) -> Any:
    M = visitpad_manufacturer_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code,
        short_name=_norm_opt_str(payload.short_name),
        display_name=payload.display_name.strip(),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_manufacturer_by_id(
    repository: VisitpadManufacturerRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_manufacturer(
    repository: VisitpadManufacturerRepository,
    *,
    row_id: UUID,
    payload: VisitpadManufacturerUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_manufacturer(
    repository: VisitpadManufacturerRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

"""Visitpad — Rx columns use-cases."""

from __future__ import annotations

import uuid
from uuid import UUID

from app.models.visitpad_rx_column import VisitpadRxColumnModel
from app.repositories.visitpad_rx_column_repository import VisitpadRxColumnRepository
from app.schemas.visitpad_rx_column import VisitpadRxColumnCreate, VisitpadRxColumnUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_rx_columns(
    repository: VisitpadRxColumnRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    section: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadRxColumnModel], int]:
    return repository.list_rx_columns(
        tenant_id=tenant_id,
        search=search,
        section=section,
        limit=limit,
        offset=offset,
    )


def create_visitpad_rx_column(
    repository: VisitpadRxColumnRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadRxColumnCreate,
) -> VisitpadRxColumnModel:
    row = VisitpadRxColumnModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        section=payload.section.value,
        display_name=payload.display_name.strip(),
        code=payload.code.strip(),
        extra_unit=_norm_opt_str(payload.extra_unit),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    return repository.create(row)


def get_visitpad_rx_column_by_id(
    repository: VisitpadRxColumnRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadRxColumnModel | None:
    return repository.get_by_id(row_id, tenant_id=tenant_id)


def update_visitpad_rx_column(
    repository: VisitpadRxColumnRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
    payload: VisitpadRxColumnUpdate,
) -> VisitpadRxColumnModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
        return None
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.code is not None:
        row.code = payload.code.strip()
    if payload.extra_unit is not None:
        row.extra_unit = _norm_opt_str(payload.extra_unit)
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_rx_column(
    repository: VisitpadRxColumnRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadRxColumnModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

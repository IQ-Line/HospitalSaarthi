"""Visitpad — Rx columns use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad_table_models import visitpad_rx_column_model
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
    search: str | None,
    section: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_rx_columns(
        search=search,
        section=section,
        limit=limit,
        offset=offset,
    )


def create_visitpad_rx_column(
    repository: VisitpadRxColumnRepository,
    *,
    payload: VisitpadRxColumnCreate,
) -> Any:
    M = visitpad_rx_column_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        section=payload.section.value,
        display_name=payload.display_name.strip(),
        code=payload.code.strip(),
        extra_unit=_norm_opt_str(payload.extra_unit),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(tenant_id=repository.scope.tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_rx_column_by_id(
    repository: VisitpadRxColumnRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_rx_column(
    repository: VisitpadRxColumnRepository,
    *,
    row_id: UUID,
    payload: VisitpadRxColumnUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.tenant_id != repository.scope.tenant_id:
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
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

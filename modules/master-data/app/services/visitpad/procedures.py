"""Visitpad — procedures use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_procedure_model
from app.repositories.visitpad.procedure import VisitpadProcedureRepository
from app.schemas.visitpad.procedure import VisitpadProcedureCreate, VisitpadProcedureUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_procedures(
    repository: VisitpadProcedureRepository,
    *,
    search: str | None,
    category: str | None,
    billing_category: str | None,
    is_active: bool | None = None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_procedures(
        search=search,
        category=category,
        billing_category=billing_category,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )


def create_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    payload: VisitpadProcedureCreate,
) -> Any:
    M = visitpad_procedure_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        cpt_code=payload.cpt_code,
        short_name=payload.short_name,
        official_descriptor=payload.official_descriptor.strip(),
        display_name=payload.display_name.strip(),
        category=payload.category.value,
        billing_category=payload.billing_category.value,
        duration_minutes=payload.duration_minutes,
        requires_consent=payload.requires_consent,
        type_modality=_norm_opt_str(payload.type_modality),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
        snomed_code=_norm_opt_str(payload.snomed_code),
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_procedure_by_id(
    repository: VisitpadProcedureRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    row_id: UUID,
    payload: VisitpadProcedureUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "official_descriptor" in dump and payload.official_descriptor is not None:
        row.official_descriptor = payload.official_descriptor.strip()
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "category" in dump and payload.category is not None:
        row.category = payload.category.value
    if "billing_category" in dump and payload.billing_category is not None:
        row.billing_category = payload.billing_category.value
    if "duration_minutes" in dump and payload.duration_minutes is not None:
        row.duration_minutes = payload.duration_minutes
    if "requires_consent" in dump and payload.requires_consent is not None:
        row.requires_consent = payload.requires_consent
    if "type_modality" in dump:
        row.type_modality = _norm_opt_str(payload.type_modality)
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

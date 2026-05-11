"""Visitpad — procedures use-cases."""

from __future__ import annotations

import uuid
from uuid import UUID

from app.models.visitpad_procedure import VisitpadProcedureModel
from app.repositories.visitpad_procedure_repository import VisitpadProcedureRepository
from app.schemas.visitpad_procedure import VisitpadProcedureCreate, VisitpadProcedureUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_procedures(
    repository: VisitpadProcedureRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    category: str | None,
    billing_category: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadProcedureModel], int]:
    return repository.list_procedures(
        tenant_id=tenant_id,
        search=search,
        category=category,
        billing_category=billing_category,
        limit=limit,
        offset=offset,
    )


def create_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadProcedureCreate,
) -> VisitpadProcedureModel:
    row = VisitpadProcedureModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        cpt_code=payload.cpt_code.strip(),
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
    return repository.create(row)


def get_visitpad_procedure_by_id(
    repository: VisitpadProcedureRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadProcedureModel | None:
    return repository.get_by_id(row_id, tenant_id=tenant_id)


def update_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
    payload: VisitpadProcedureUpdate,
) -> VisitpadProcedureModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
        return None
    if payload.cpt_code is not None:
        row.cpt_code = payload.cpt_code.strip()
    if payload.official_descriptor is not None:
        row.official_descriptor = payload.official_descriptor.strip()
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.category is not None:
        row.category = payload.category.value
    if payload.billing_category is not None:
        row.billing_category = payload.billing_category.value
    if payload.duration_minutes is not None:
        row.duration_minutes = payload.duration_minutes
    if payload.requires_consent is not None:
        row.requires_consent = payload.requires_consent
    if payload.type_modality is not None:
        row.type_modality = _norm_opt_str(payload.type_modality)
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.snomed_code is not None:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_procedure(
    repository: VisitpadProcedureRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadProcedureModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

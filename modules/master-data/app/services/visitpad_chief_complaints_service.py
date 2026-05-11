"""Visitpad — chief complaints use-cases."""

from __future__ import annotations

import uuid
from uuid import UUID

from app.models.visitpad_chief_complaint import VisitpadChiefComplaintModel
from app.repositories.visitpad_chief_complaint_repository import VisitpadChiefComplaintRepository
from app.schemas.visitpad_chief_complaint import VisitpadChiefComplaintCreate, VisitpadChiefComplaintUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_chief_complaints(
    repository: VisitpadChiefComplaintRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    body_system: str | None,
    triage_priority: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadChiefComplaintModel], int]:
    return repository.list_chief_complaints(
        tenant_id=tenant_id,
        search=search,
        body_system=body_system,
        triage_priority=triage_priority,
        limit=limit,
        offset=offset,
    )


def create_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadChiefComplaintCreate,
) -> VisitpadChiefComplaintModel:
    row = VisitpadChiefComplaintModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        code=payload.code.strip(),
        display_name=payload.display_name.strip(),
        body_system=payload.body_system.value,
        triage_priority=payload.triage_priority.value,
        synonyms=list(payload.synonyms),
        is_paediatric_relevant=payload.is_paediatric_relevant,
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
        snomed_code=_norm_opt_str(payload.snomed_code),
    )
    return repository.create(row)


def get_visitpad_chief_complaint_by_id(
    repository: VisitpadChiefComplaintRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadChiefComplaintModel | None:
    return repository.get_by_id(row_id, tenant_id=tenant_id)


def update_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
    payload: VisitpadChiefComplaintUpdate,
) -> VisitpadChiefComplaintModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
        return None
    if payload.code is not None:
        row.code = payload.code.strip()
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.body_system is not None:
        row.body_system = payload.body_system.value
    if payload.triage_priority is not None:
        row.triage_priority = payload.triage_priority.value
    if payload.synonyms is not None:
        row.synonyms = list(payload.synonyms)
    if payload.is_paediatric_relevant is not None:
        row.is_paediatric_relevant = payload.is_paediatric_relevant
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.snomed_code is not None:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    tenant_id: UUID,
    row_id: UUID,
) -> VisitpadChiefComplaintModel | None:
    row = repository.get_by_id(row_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

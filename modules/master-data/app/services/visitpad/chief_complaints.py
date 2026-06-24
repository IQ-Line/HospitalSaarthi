"""Visitpad — chief complaints use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_chief_complaint_model
from app.repositories.visitpad.chief_complaint import VisitpadChiefComplaintRepository
from app.schemas.visitpad.chief_complaint import (
    VisitpadChiefComplaintCreate,
    VisitpadChiefComplaintUpdate,
)


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_chief_complaints(
    repository: VisitpadChiefComplaintRepository,
    *,
    search: str | None,
    body_system: str | None,
    triage_priority: str | None,
    is_active: bool | None = None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_chief_complaints(
        search=search,
        body_system=body_system,
        triage_priority=triage_priority,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )


def create_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    payload: VisitpadChiefComplaintCreate,
) -> Any:
    M = visitpad_chief_complaint_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code.strip(),
        display_name=payload.display_name.strip(),
        short_name=_norm_opt_str(payload.short_name),
        body_system=payload.body_system.value,
        triage_priority=payload.triage_priority.value,
        synonyms=list(payload.synonyms),
        is_paediatric_relevant=payload.is_paediatric_relevant,
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


def get_visitpad_chief_complaint_by_id(
    repository: VisitpadChiefComplaintRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    row_id: UUID,
    payload: VisitpadChiefComplaintUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "code" in dump and payload.code is not None:
        row.code = payload.code.strip()
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "body_system" in dump and payload.body_system is not None:
        row.body_system = payload.body_system.value
    if "triage_priority" in dump and payload.triage_priority is not None:
        row.triage_priority = payload.triage_priority.value
    if "synonyms" in dump and payload.synonyms is not None:
        row.synonyms = list(payload.synonyms)
    if "is_paediatric_relevant" in dump and payload.is_paediatric_relevant is not None:
        row.is_paediatric_relevant = payload.is_paediatric_relevant
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_chief_complaint(
    repository: VisitpadChiefComplaintRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

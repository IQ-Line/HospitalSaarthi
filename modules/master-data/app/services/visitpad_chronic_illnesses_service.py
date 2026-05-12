"""Visitpad — chronic illnesses use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad_table_models import visitpad_chronic_illness_model
from app.repositories.visitpad_chronic_illness_repository import VisitpadChronicIllnessRepository
from app.schemas.visitpad_chronic_illness import VisitpadChronicIllnessCreate, VisitpadChronicIllnessUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_chronic_illnesses(
    repository: VisitpadChronicIllnessRepository,
    *,
    search: str | None,
    category: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_chronic_illnesses(
        search=search,
        category=category,
        limit=limit,
        offset=offset,
    )


def create_visitpad_chronic_illness(
    repository: VisitpadChronicIllnessRepository,
    *,
    payload: VisitpadChronicIllnessCreate,
) -> Any:
    M = visitpad_chronic_illness_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        display_name=payload.display_name.strip(),
        icd10_code=payload.icd10_code.strip(),
        category=payload.category.value,
        snomed_code=_norm_opt_str(payload.snomed_code),
        chronic_illness_prompt=payload.chronic_illness_prompt,
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_chronic_illness_by_id(
    repository: VisitpadChronicIllnessRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_chronic_illness(
    repository: VisitpadChronicIllnessRepository,
    *,
    row_id: UUID,
    payload: VisitpadChronicIllnessUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "category" in dump and payload.category is not None:
        row.category = payload.category.value
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "chronic_illness_prompt" in dump and payload.chronic_illness_prompt is not None:
        row.chronic_illness_prompt = payload.chronic_illness_prompt
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_chronic_illness(
    repository: VisitpadChronicIllnessRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

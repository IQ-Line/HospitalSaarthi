"""Visitpad — diagnoses use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad_table_models import visitpad_diagnosis_model
from app.repositories.visitpad_diagnosis_repository import VisitpadDiagnosisRepository
from app.schemas.visitpad_diagnosis import VisitpadDiagnosisCreate, VisitpadDiagnosisUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_diagnoses(
    repository: VisitpadDiagnosisRepository,
    *,
    search: str | None,
    category: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_diagnoses(
        search=search,
        category=category,
        limit=limit,
        offset=offset,
    )


def create_visitpad_diagnosis(
    repository: VisitpadDiagnosisRepository,
    *,
    payload: VisitpadDiagnosisCreate,
) -> Any:
    M = visitpad_diagnosis_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        icd10_code=payload.icd10_code.strip(),
        icd_version=payload.icd_version.value,
        official_descriptor=payload.official_descriptor.strip(),
        display_name=payload.display_name.strip(),
        category=payload.category.value,
        is_chronic_flag=payload.is_chronic_flag,
        is_notifiable=payload.is_notifiable,
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
        snomed_code=_norm_opt_str(payload.snomed_code),
    )
    if repository.scope.is_tenant:
        row = M(tenant_id=repository.scope.tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_diagnosis_by_id(
    repository: VisitpadDiagnosisRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_diagnosis(
    repository: VisitpadDiagnosisRepository,
    *,
    row_id: UUID,
    payload: VisitpadDiagnosisUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.tenant_id != repository.scope.tenant_id:
        return None
    if payload.icd10_code is not None:
        row.icd10_code = payload.icd10_code.strip()
    if payload.icd_version is not None:
        row.icd_version = payload.icd_version.value
    if payload.official_descriptor is not None:
        row.official_descriptor = payload.official_descriptor.strip()
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.category is not None:
        row.category = payload.category.value
    if payload.is_chronic_flag is not None:
        row.is_chronic_flag = payload.is_chronic_flag
    if payload.is_notifiable is not None:
        row.is_notifiable = payload.is_notifiable
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.snomed_code is not None:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_diagnosis(
    repository: VisitpadDiagnosisRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

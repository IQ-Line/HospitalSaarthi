"""Visitpad — diagnoses use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_diagnosis_model
from app.repositories.visitpad.diagnosis import VisitpadDiagnosisRepository
from app.schemas.visitpad.diagnosis import VisitpadDiagnosisCreate, VisitpadDiagnosisUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def _icd_block_from_create(
    payload: VisitpadDiagnosisCreate,
) -> tuple[str | None, str | None, str | None, str | None]:
    if (
        payload.icd10_code
        and payload.icd10_code.strip()
        and payload.icd_version is not None
        and payload.official_descriptor
        and payload.official_descriptor.strip()
        and payload.category is not None
    ):
        return (
            payload.icd10_code.strip(),
            payload.icd_version.value,
            payload.official_descriptor.strip(),
            payload.category.value,
        )
    return None, None, None, None


def list_visitpad_diagnoses(
    repository: VisitpadDiagnosisRepository,
    *,
    search: str | None,
    category: str | None,
    is_active: bool | None = None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_diagnoses(
        search=search,
        category=category,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )


def create_visitpad_diagnosis(
    repository: VisitpadDiagnosisRepository,
    *,
    payload: VisitpadDiagnosisCreate,
) -> Any:
    M = visitpad_diagnosis_model(repository.scope)
    icd10_code, icd_version, official_descriptor, category = _icd_block_from_create(payload)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code.strip(),
        short_name=_norm_opt_str(payload.short_name),
        icd10_code=icd10_code,
        icd_version=icd_version,
        official_descriptor=official_descriptor,
        display_name=payload.display_name.strip(),
        category=category,
        is_chronic_flag=payload.is_chronic_flag,
        is_notifiable=payload.is_notifiable,
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
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    dump = payload.model_dump(exclude_unset=True)
    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "is_chronic_flag" in dump and payload.is_chronic_flag is not None:
        row.is_chronic_flag = payload.is_chronic_flag
    if "is_notifiable" in dump and payload.is_notifiable is not None:
        row.is_notifiable = payload.is_notifiable
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "snomed_code" in dump:
        row.snomed_code = _norm_opt_str(payload.snomed_code)
    if "is_deleted" in dump and payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted

    icd_keys = ("icd10_code", "icd_version", "official_descriptor", "category")
    if all(k in dump for k in icd_keys):
        if all(dump[k] is None for k in icd_keys):
            row.icd10_code = None
            row.icd_version = None
            row.official_descriptor = None
            row.category = None
        elif (
            payload.icd10_code is not None
            and payload.icd10_code.strip() != ""
            and payload.icd_version is not None
            and payload.official_descriptor is not None
            and payload.official_descriptor.strip() != ""
            and payload.category is not None
        ):
            row.icd10_code = payload.icd10_code.strip()
            row.icd_version = payload.icd_version.value
            row.official_descriptor = payload.official_descriptor.strip()
            row.category = payload.category.value

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

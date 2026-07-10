"""Visitpad — vitals use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_vital_model
from app.repositories.visitpad.vital import VisitpadVitalRepository
from app.schemas.visitpad.vital import VisitpadVitalCreate, VisitpadVitalUpdate


class InvalidVitalRangeError(Exception):
    def __init__(
        self,
        message: str = "critical_low must be less than or equal to critical_high.",
    ) -> None:
        self.message = message
        super().__init__(message)


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def _ensure_critical(*, low: float | None, high: float | None) -> None:
    if low is not None and high is not None and low > high:
        raise InvalidVitalRangeError()


def list_visitpad_vitals(
    repository: VisitpadVitalRepository,
    *,
    search: str | None,
    category: str | None,
    is_active: bool | None = None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_vitals(
        search=search,
        category=category,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )


def create_visitpad_vital(
    repository: VisitpadVitalRepository,
    *,
    payload: VisitpadVitalCreate,
) -> Any:
    _ensure_critical(low=payload.critical_low, high=payload.critical_high)
    M = visitpad_vital_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code.strip(),
        name=payload.name.strip(),
        short_name=payload.short_name.strip(),
        category=payload.category.value,
        data_type=payload.data_type.value,
        unit=payload.unit.strip(),
        default_unit_code=payload.default_unit_code.strip(),
        allowed_units=list(payload.allowed_units),
        critical_low=payload.critical_low,
        critical_high=payload.critical_high,
        reference_kind=payload.reference_kind.value,
        reference_json=dict(payload.reference_json),
        normal_range_adult=dict(payload.normal_range_adult),
        normal_range_paediatric=dict(payload.normal_range_paediatric),
        input_method=payload.input_method.value,
        is_paired=payload.is_paired,
        pair_code=_norm_opt_str(payload.pair_code),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
        loinc_code=_norm_opt_str(payload.loinc_code),
        snomed_observable_code=_norm_opt_str(payload.snomed_observable_code),
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_vital_by_id(
    repository: VisitpadVitalRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_vital(
    repository: VisitpadVitalRepository,
    *,
    row_id: UUID,
    payload: VisitpadVitalUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None
    lo = payload.critical_low if payload.critical_low is not None else row.critical_low
    hi = payload.critical_high if payload.critical_high is not None else row.critical_high
    _ensure_critical(low=lo, high=hi)

    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.short_name is not None:
        row.short_name = payload.short_name.strip()
    if payload.category is not None:
        row.category = payload.category.value
    if payload.data_type is not None:
        row.data_type = payload.data_type.value
    if payload.unit is not None:
        row.unit = payload.unit.strip()
    if payload.default_unit_code is not None:
        row.default_unit_code = payload.default_unit_code.strip()
    if payload.allowed_units is not None:
        row.allowed_units = list(payload.allowed_units)
    if payload.critical_low is not None:
        row.critical_low = payload.critical_low
    if payload.critical_high is not None:
        row.critical_high = payload.critical_high
    if payload.reference_kind is not None:
        row.reference_kind = payload.reference_kind.value
    if payload.reference_json is not None:
        row.reference_json = dict(payload.reference_json)
    if payload.normal_range_adult is not None:
        row.normal_range_adult = dict(payload.normal_range_adult)
    if payload.normal_range_paediatric is not None:
        row.normal_range_paediatric = dict(payload.normal_range_paediatric)
    if payload.input_method is not None:
        row.input_method = payload.input_method.value
    if payload.is_paired is not None:
        row.is_paired = payload.is_paired
    if payload.pair_code is not None:
        row.pair_code = _norm_opt_str(payload.pair_code)
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.loinc_code is not None:
        row.loinc_code = _norm_opt_str(payload.loinc_code)
    if payload.snomed_observable_code is not None:
        row.snomed_observable_code = _norm_opt_str(payload.snomed_observable_code)
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_vital(
    repository: VisitpadVitalRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

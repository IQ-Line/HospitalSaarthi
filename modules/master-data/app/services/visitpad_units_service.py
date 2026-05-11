"""Visitpad — units and unit conversions (use-cases over repositories)."""

from __future__ import annotations

import uuid
from uuid import UUID

from app.models.visitpad_unit import VisitpadUnitModel
from app.models.visitpad_unit_conversion import VisitpadUnitConversionModel
from app.repositories.visitpad_unit_conversion_repository import VisitpadUnitConversionRepository
from app.repositories.visitpad_unit_repository import VisitpadUnitRepository
from app.schemas.visitpad_unit import (
    VisitpadUnitConversionCreate,
    VisitpadUnitConversionUpdate,
    VisitpadUnitCreate,
    VisitpadUnitUpdate,
)


class InvalidVisitpadUnitConversionError(Exception):
    """Invalid conversion definition (e.g. from == to or unknown unit code)."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class VisitpadUnitBlockedByActiveConversionsError(Exception):
    """Cannot deactivate or soft-delete a unit while non-deleted conversions reference it."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def list_visitpad_units(
    repository: VisitpadUnitRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    dimension: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadUnitModel], int]:
    return repository.list_units(
        tenant_id=tenant_id,
        search=search,
        dimension=dimension,
        limit=limit,
        offset=offset,
    )


def create_visitpad_unit(
    repository: VisitpadUnitRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadUnitCreate,
) -> VisitpadUnitModel:
    row = VisitpadUnitModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        code=payload.code.strip().lower(),
        display_label=payload.display_label.strip(),
        dimension=payload.dimension.value,
        ucum_code=payload.ucum_code.strip() if payload.ucum_code else None,
        is_canonical=payload.is_canonical,
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    return repository.create_unit(row)


def get_visitpad_unit_by_id(
    repository: VisitpadUnitRepository,
    *,
    tenant_id: UUID,
    unit_id: UUID,
) -> VisitpadUnitModel | None:
    return repository.get_unit_by_id(unit_id, tenant_id=tenant_id)


def update_visitpad_unit(
    repository: VisitpadUnitRepository,
    conv_repo: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    unit_id: UUID,
    payload: VisitpadUnitUpdate,
) -> VisitpadUnitModel | None:
    row = repository.get_unit_by_id(unit_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
        return None
    will_deactivate = payload.is_active is False and row.is_active
    will_soft_delete = payload.is_deleted is True and not row.is_deleted
    if (
        (will_deactivate or will_soft_delete)
        and conv_repo.count_active_conversions_referencing_unit_code(
            tenant_id=tenant_id,
            unit_code=row.code,
        )
        > 0
    ):
        raise VisitpadUnitBlockedByActiveConversionsError(
            "Cannot deactivate or delete this unit while active conversions reference its code.",
        )
    if payload.display_label is not None:
        row.display_label = payload.display_label.strip()
    if payload.dimension is not None:
        row.dimension = payload.dimension.value
    if payload.ucum_code is not None:
        row.ucum_code = payload.ucum_code.strip() if payload.ucum_code else None
    if payload.is_canonical is not None:
        row.is_canonical = payload.is_canonical
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update_unit(row)


def soft_delete_visitpad_unit(
    repository: VisitpadUnitRepository,
    conv_repo: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    unit_id: UUID,
) -> VisitpadUnitModel | None:
    row = repository.get_unit_by_id(unit_id, tenant_id=tenant_id)
    if row is None:
        return None
    if conv_repo.count_active_conversions_referencing_unit_code(
        tenant_id=tenant_id,
        unit_code=row.code,
    ) > 0:
        raise VisitpadUnitBlockedByActiveConversionsError(
            "Cannot deactivate or delete this unit while active conversions reference its code.",
        )
    row.is_deleted = True
    return repository.update_unit(row)


def _ensure_conversion_pair_valid(
    unit_repo: VisitpadUnitRepository,
    *,
    tenant_id: UUID,
    from_code: str,
    to_code: str,
) -> None:
    fc = from_code.strip().lower()
    tc = to_code.strip().lower()
    if fc == tc:
        raise InvalidVisitpadUnitConversionError("from_unit_code and to_unit_code must differ.")
    for code in (fc, tc):
        if unit_repo.get_active_unit_by_code(tenant_id=tenant_id, code=code) is None:
            raise InvalidVisitpadUnitConversionError(
                f"No active unit with code '{code}' for this tenant.",
            )


def list_visitpad_unit_conversions(
    repository: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    search: str | None,
    from_unit_code: str | None,
    limit: int,
    offset: int,
) -> tuple[list[VisitpadUnitConversionModel], int]:
    return repository.list_conversions(
        tenant_id=tenant_id,
        search=search,
        from_unit_code=from_unit_code,
        limit=limit,
        offset=offset,
    )


def create_visitpad_unit_conversion(
    unit_repo: VisitpadUnitRepository,
    conv_repo: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    payload: VisitpadUnitConversionCreate,
) -> VisitpadUnitConversionModel:
    fc = payload.from_unit_code.strip().lower()
    tc = payload.to_unit_code.strip().lower()
    _ensure_conversion_pair_valid(unit_repo, tenant_id=tenant_id, from_code=fc, to_code=tc)
    row = VisitpadUnitConversionModel(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        from_unit_code=fc,
        to_unit_code=tc,
        factor=payload.factor,
        offset_value=payload.offset_value,
        display_order=payload.display_order,
        is_deleted=False,
    )
    return conv_repo.create_conversion(row)


def get_visitpad_unit_conversion_by_id(
    repository: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    conversion_id: UUID,
) -> VisitpadUnitConversionModel | None:
    return repository.get_conversion_by_id(conversion_id, tenant_id=tenant_id)


def update_visitpad_unit_conversion(
    unit_repo: VisitpadUnitRepository,
    conv_repo: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    conversion_id: UUID,
    payload: VisitpadUnitConversionUpdate,
) -> VisitpadUnitConversionModel | None:
    row = conv_repo.get_conversion_by_id(conversion_id, tenant_id=tenant_id, include_deleted=True)
    if row is None or row.tenant_id != tenant_id:
        return None
    if payload.from_unit_code is not None:
        fc = payload.from_unit_code.strip().lower()
    else:
        fc = row.from_unit_code.strip().lower()
    if payload.to_unit_code is not None:
        tc = payload.to_unit_code.strip().lower()
    else:
        tc = row.to_unit_code.strip().lower()
    _ensure_conversion_pair_valid(unit_repo, tenant_id=tenant_id, from_code=fc, to_code=tc)
    if payload.from_unit_code is not None:
        row.from_unit_code = fc
    if payload.to_unit_code is not None:
        row.to_unit_code = tc
    if payload.factor is not None:
        row.factor = payload.factor
    if payload.offset_value is not None:
        row.offset_value = payload.offset_value
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return conv_repo.update_conversion(row)


def soft_delete_visitpad_unit_conversion(
    repository: VisitpadUnitConversionRepository,
    *,
    tenant_id: UUID,
    conversion_id: UUID,
) -> VisitpadUnitConversionModel | None:
    row = repository.get_conversion_by_id(conversion_id, tenant_id=tenant_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update_conversion(row)

# ruff: noqa: E501, UP047
"""Bulk copy Visitpad rows from the platform (public) catalog into the tenant catalog."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any, TypeVar
from uuid import UUID

from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog.visitpad.table_models import (
    visitpad_allergen_model,
    visitpad_allergy_reaction_model,
    visitpad_chief_complaint_model,
    visitpad_chronic_illness_model,
    visitpad_diagnosis_model,
    visitpad_manufacturer_model,
    visitpad_medicine_model,
    visitpad_procedure_model,
    visitpad_rx_column_model,
    visitpad_unit_conversion_model,
    visitpad_unit_model,
    visitpad_vaccine_model,
    visitpad_vital_model,
)
from app.core.catalog_scope import CatalogScope
from app.repositories.visitpad.conversion import DuplicateVisitpadUnitConversionKeyError
from app.repositories.visitpad.integrity import DuplicateVisitpadCatalogKeyError
from app.repositories.visitpad.unit import DuplicateVisitpadUnitKeyError
from app.schemas.visitpad.allergen import (
    VisitpadAllergenCreate,
    VisitpadAllergenResponse,
    VisitpadAllergyReactionCreate,
    VisitpadAllergyReactionResponse,
)
from app.schemas.visitpad.chief_complaint import (
    VisitpadChiefComplaintCreate,
    VisitpadChiefComplaintResponse,
)
from app.schemas.visitpad.chronic_illness import (
    VisitpadChronicIllnessCreate,
    VisitpadChronicIllnessResponse,
)
from app.schemas.visitpad.diagnosis import VisitpadDiagnosisCreate, VisitpadDiagnosisResponse
from app.schemas.visitpad.manufacturer import (
    VisitpadManufacturerCreate,
    VisitpadManufacturerResponse,
)
from app.schemas.visitpad.medicine import VisitpadMedicineCreate, VisitpadMedicineResponse
from app.schemas.visitpad.platform_import import (
    VisitpadPlatformImportData,
    VisitpadPlatformImportErrorItem,
)
from app.schemas.visitpad.procedure import VisitpadProcedureCreate, VisitpadProcedureResponse
from app.schemas.visitpad.rx_column import (
    VisitpadRxColumnCreate,
    VisitpadRxColumnResponse,
    VisitpadRxColumnSection,
)
from app.schemas.visitpad.unit import (
    VisitpadUnitConversionCreate,
    VisitpadUnitConversionResponse,
    VisitpadUnitCreate,
    VisitpadUnitResponse,
)
from app.schemas.visitpad.vaccine import VisitpadVaccineCreate, VisitpadVaccineResponse
from app.schemas.visitpad.vital import VisitpadVitalCreate, VisitpadVitalResponse
from app.services.visitpad import platform_bulk_import_pg as _visitpad_bulk_pg
from app.services.visitpad._pg_bulk_insert import session_is_postgresql
from app.services.visitpad.allergies import (
    create_visitpad_allergen,
    create_visitpad_allergy_reaction,
)
from app.services.visitpad.chief_complaints import create_visitpad_chief_complaint
from app.services.visitpad.chronic_illnesses import create_visitpad_chronic_illness
from app.services.visitpad.diagnoses import create_visitpad_diagnosis
from app.services.visitpad.manufacturers import create_visitpad_manufacturer
from app.services.visitpad.medicines import create_visitpad_medicine
from app.services.visitpad.procedures import create_visitpad_procedure
from app.services.visitpad.rx_columns import create_visitpad_rx_column
from app.services.visitpad.units import (
    InvalidVisitpadUnitConversionError,
    create_visitpad_unit,
    create_visitpad_unit_conversion,
)
from app.services.visitpad.vaccines import create_visitpad_vaccine
from app.services.visitpad.vitals import (
    InvalidVitalRangeError,
    _ensure_critical,
    create_visitpad_vital,
)

RespT = TypeVar("RespT", bound=BaseModel)
CreT = TypeVar("CreT", bound=BaseModel)


def _require_tenant_scope(scope: CatalogScope) -> None:
    if not scope.is_tenant:
        msg = "Import from platform requires tenant catalog scope (iq_tenant_id header)."
        raise ValueError(msg)


def _fetch_public_by_ids(session: Session, model_cls: type[Any], ids: list[UUID]) -> dict[Any, Any]:
    if not ids:
        return {}
    stmt = select(model_cls).where(model_cls.id.in_(ids), model_cls.is_deleted.is_(False))
    rows = session.scalars(stmt).unique().all()
    return {r.id: r for r in rows}


def _orm_to_create(row: Any, *, response_cls: type[RespT], create_cls: type[CreT]) -> CreT:
    resp = response_cls.model_validate(row)
    keys = create_cls.model_fields.keys()
    return create_cls.model_validate({k: getattr(resp, k) for k in keys})


def _fmt_validation_error(exc: ValidationError) -> str:
    return "; ".join(f"{e['loc']}: {e['msg']}" for e in exc.errors())


def _collect_valid_from_platform(
    platform_row_ids: Sequence[Any],
    by_id: dict[Any, Any],
    *,
    response_cls: type[RespT],
    create_cls: type[CreT],
    before_parse: Callable[[UUID, Any], str | None] | None = None,
    after_parse: Callable[[UUID, CreT], str | None] | None = None,
) -> tuple[list[tuple[UUID, CreT]], list[VisitpadPlatformImportErrorItem]]:
    """Map platform row ids to create payloads; collect validation / filter errors."""
    errors: list[VisitpadPlatformImportErrorItem] = []
    valid: list[tuple[UUID, CreT]] = []
    for pid in platform_row_ids:
        pub = by_id.get(pid)
        if pub is None:
            errors.append(
                VisitpadPlatformImportErrorItem(platform_row_id=pid, message="Platform row not found."),
            )
            continue
        if before_parse is not None:
            pre = before_parse(pid, pub)
            if pre is not None:
                errors.append(VisitpadPlatformImportErrorItem(platform_row_id=pid, message=pre))
                continue
        try:
            payload = _orm_to_create(pub, response_cls=response_cls, create_cls=create_cls)
        except ValidationError as exc:
            errors.append(
                VisitpadPlatformImportErrorItem(platform_row_id=pid, message=_fmt_validation_error(exc)),
            )
            continue
        if after_parse is not None:
            post = after_parse(pid, payload)
            if post is not None:
                errors.append(VisitpadPlatformImportErrorItem(platform_row_id=pid, message=post))
                continue
        valid.append((pid, payload))
    return valid, errors


def _sqlite_insert_skip_duplicates(
    session: Session,
    valid: list[tuple[UUID, Any]],
    *,
    insert_row: Callable[[Any], Any],
    duplicate_exceptions: tuple[type[BaseException], ...],
) -> tuple[list[UUID], list[UUID]]:
    created: list[UUID] = []
    skipped: list[UUID] = []
    for pid, payload in valid:
        try:
            with session.begin_nested():
                row = insert_row(payload)
            created.append(row.id)
        except duplicate_exceptions:
            skipped.append(pid)
    return created, skipped


def _require_active_platform_row(_pid: UUID, pub: Any) -> str | None:
    if not getattr(pub, "is_active", True):
        return "Cannot import inactive platform catalog rows."
    return None


def _chain_before_parse(
    *fns: Callable[[UUID, Any], str | None],
) -> Callable[[UUID, Any], str | None]:
    def _combined(pid: UUID, pub: Any) -> str | None:
        for fn in fns:
            result = fn(pid, pub)
            if result is not None:
                return result
        return None

    return _combined


def _vital_critical_range_after_parse(_pid: UUID, payload: VisitpadVitalCreate) -> str | None:
    try:
        _ensure_critical(low=payload.critical_low, high=payload.critical_high)
    except InvalidVitalRangeError as exc:
        return exc.message
    return None


def import_visitpad_units_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_unit_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadUnitResponse,
        create_cls=VisitpadUnitCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_units(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_unit(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadUnitKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_unit_conversions_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    unit_repo: Any,
    conv_repo: Any,
    platform_row_ids: list[Any],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_unit_conversion_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadUnitConversionResponse,
        create_cls=VisitpadUnitConversionCreate,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped, conv_errors = _visitpad_bulk_pg.pg_import_unit_conversions(session, scope, unit_repo, valid)
        errors.extend(conv_errors)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created: list[Any] = []
    skipped: list[Any] = []
    for pid, payload in valid:
        try:
            with session.begin_nested():
                row = create_visitpad_unit_conversion(unit_repo, conv_repo, payload=payload)
            created.append(row.id)
        except DuplicateVisitpadUnitConversionKeyError:
            skipped.append(pid)
        except InvalidVisitpadUnitConversionError as exc:
            errors.append(VisitpadPlatformImportErrorItem(platform_row_id=pid, message=exc.message))
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_vitals_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_vital_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadVitalResponse,
        create_cls=VisitpadVitalCreate,
        before_parse=_require_active_platform_row,
        after_parse=_vital_critical_range_after_parse,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_vitals(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created: list[Any] = []
    skipped: list[Any] = []
    for pid, payload in valid:
        try:
            with session.begin_nested():
                row = create_visitpad_vital(tenant_repo, payload=payload)
            created.append(row.id)
        except DuplicateVisitpadCatalogKeyError:
            skipped.append(pid)
        except InvalidVitalRangeError as exc:
            errors.append(VisitpadPlatformImportErrorItem(platform_row_id=pid, message=exc.message))
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_chief_complaints_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_chief_complaint_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadChiefComplaintResponse,
        create_cls=VisitpadChiefComplaintCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_chief_complaints(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_chief_complaint(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_diagnoses_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_diagnosis_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadDiagnosisResponse,
        create_cls=VisitpadDiagnosisCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_diagnoses(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_diagnosis(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_allergens_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_allergen_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadAllergenResponse,
        create_cls=VisitpadAllergenCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_allergens(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_allergen(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_allergy_reactions_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_allergy_reaction_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadAllergyReactionResponse,
        create_cls=VisitpadAllergyReactionCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_allergy_reactions(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_allergy_reaction(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_rx_columns_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[Any],
    section: VisitpadRxColumnSection,
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_rx_column_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)

    def _rx_section_ok(_pid: UUID, pub: Any) -> str | None:
        if str(pub.section) != section.value:
            return f"Platform row section mismatch (expected {section.value!r})."
        return None

    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadRxColumnResponse,
        create_cls=VisitpadRxColumnCreate,
        before_parse=_chain_before_parse(_require_active_platform_row, _rx_section_ok),
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_rx_columns(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_rx_column(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_medicines_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_medicine_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadMedicineResponse,
        create_cls=VisitpadMedicineCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_medicines(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_medicine(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_chronic_illnesses_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_chronic_illness_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadChronicIllnessResponse,
        create_cls=VisitpadChronicIllnessCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_chronic_illnesses(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_chronic_illness(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_procedures_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_procedure_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadProcedureResponse,
        create_cls=VisitpadProcedureCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_procedures(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_procedure(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_vaccines_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_vaccine_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadVaccineResponse,
        create_cls=VisitpadVaccineCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_vaccines(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_vaccine(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)


def import_visitpad_manufacturers_from_platform(
    session: Session,
    *,
    scope: CatalogScope,
    tenant_repo: Any,
    platform_row_ids: list[UUID],
) -> VisitpadPlatformImportData:
    _require_tenant_scope(scope)
    M = visitpad_manufacturer_model(CatalogScope(None))
    by_id = _fetch_public_by_ids(session, M, platform_row_ids)
    valid, errors = _collect_valid_from_platform(
        platform_row_ids,
        by_id,
        response_cls=VisitpadManufacturerResponse,
        create_cls=VisitpadManufacturerCreate,
        before_parse=_require_active_platform_row,
    )
    if not valid:
        return VisitpadPlatformImportData(created=[], skipped=[], errors=errors)
    if session_is_postgresql(session):
        created, skipped = _visitpad_bulk_pg.pg_import_manufacturers(session, scope, valid)
        return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)
    created, skipped = _sqlite_insert_skip_duplicates(
        session,
        valid,
        insert_row=lambda p: create_visitpad_manufacturer(tenant_repo, payload=p),
        duplicate_exceptions=(DuplicateVisitpadCatalogKeyError,),
    )
    return VisitpadPlatformImportData(created=created, skipped=skipped, errors=errors)

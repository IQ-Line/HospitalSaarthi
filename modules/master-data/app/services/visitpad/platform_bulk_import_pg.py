"""PostgreSQL batched INSERT … ON CONFLICT DO NOTHING for Visitpad platform→tenant imports."""

from __future__ import annotations

# ruff: noqa: E501
import uuid
from collections.abc import Callable
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy import text as sa_text
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
from app.schemas.visitpad.allergen import VisitpadAllergenCreate, VisitpadAllergyReactionCreate
from app.schemas.visitpad.chief_complaint import VisitpadChiefComplaintCreate
from app.schemas.visitpad.chronic_illness import VisitpadChronicIllnessCreate
from app.schemas.visitpad.diagnosis import VisitpadDiagnosisCreate
from app.schemas.visitpad.manufacturer import VisitpadManufacturerCreate
from app.schemas.visitpad.medicine import VisitpadMedicineCreate
from app.schemas.visitpad.platform_import import VisitpadPlatformImportErrorItem
from app.schemas.visitpad.procedure import VisitpadProcedureCreate
from app.schemas.visitpad.rx_column import VisitpadRxColumnCreate
from app.schemas.visitpad.unit import VisitpadUnitConversionCreate, VisitpadUnitCreate
from app.schemas.visitpad.vaccine import VisitpadVaccineCreate
from app.schemas.visitpad.vital import VisitpadVitalCreate
from app.services.visitpad._pg_bulk_insert import pg_bulk_insert_ignore_returning, utc_now_pair


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def _icd_block_from_diagnosis_create(
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


def dedupe_platform_ids_by_key(
    valid: list[tuple[UUID, Any]],
    *,
    key_fn: Callable[[Any], str],
) -> tuple[list[tuple[UUID, Any]], list[UUID]]:
    seen: set[str] = set()
    out: list[tuple[UUID, Any]] = []
    dup_skipped: list[UUID] = []
    for pid, payload in valid:
        k = key_fn(payload)
        if k in seen:
            dup_skipped.append(pid)
            continue
        seen.add(k)
        out.append((pid, payload))
    return out, dup_skipped


def _partition_ids(keys_order: list[tuple[UUID, str]], key_to_id: dict[str, UUID], dup_skipped: list[UUID]) -> tuple[list[UUID], list[UUID]]:
    created: list[UUID] = []
    skipped: list[UUID] = list(dup_skipped)
    for pid, k in keys_order:
        if k in key_to_id:
            created.append(key_to_id[k])
        else:
            skipped.append(pid)
    return created, skipped


def pg_import_units(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadUnitCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip().lower())
    TenantM = visitpad_unit_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip().lower()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": k,
                "display_name": pl.display_name.strip(),
                "dimension": pl.dimension.value,
                "ucum_code": pl.ucum_code.strip() if pl.ucum_code else None,
                "is_canonical": pl.is_canonical,
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_chief_complaints(
    session: Session,
    scope: CatalogScope,
    valid: list[tuple[UUID, VisitpadChiefComplaintCreate]],
) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_chief_complaint_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": k,
                "display_name": pl.display_name.strip(),
                "short_name": _norm_opt_str(pl.short_name),
                "body_system": pl.body_system.value,
                "triage_priority": pl.triage_priority.value,
                "synonyms": list(pl.synonyms),
                "is_paediatric_relevant": pl.is_paediatric_relevant,
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_diagnoses(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadDiagnosisCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_diagnosis_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        icd10_code, icd_version, official_descriptor, category = _icd_block_from_diagnosis_create(pl)
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": k,
                "short_name": _norm_opt_str(pl.short_name),
                "icd10_code": icd10_code,
                "icd_version": icd_version,
                "official_descriptor": official_descriptor,
                "display_name": pl.display_name.strip(),
                "category": category,
                "is_chronic_flag": pl.is_chronic_flag,
                "is_notifiable": pl.is_notifiable,
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_allergens(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadAllergenCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_allergen_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": k,
                "display_name": pl.display_name.strip(),
                "allergen_type": pl.allergen_type.value,
                "drug_class": _norm_opt_str(pl.drug_class),
                "reaction_severity_default": pl.reaction_severity_default.value,
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_allergy_reactions(
    session: Session,
    scope: CatalogScope,
    valid: list[tuple[UUID, VisitpadAllergyReactionCreate]],
) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_allergy_reaction_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "display_name": pl.display_name.strip(),
                "code": k,
                "short_name": _norm_opt_str(pl.short_name),
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_chronic_illnesses(
    session: Session,
    scope: CatalogScope,
    valid: list[tuple[UUID, VisitpadChronicIllnessCreate]],
) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.icd10_code.strip())
    TenantM = visitpad_chronic_illness_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.icd10_code.strip()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "display_name": pl.display_name.strip(),
                "icd10_code": k,
                "category": pl.category.value,
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "chronic_illness_prompt": pl.chronic_illness_prompt,
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "icd10_code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.icd10_code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_procedures(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadProcedureCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: str(p.cpt_code))
    TenantM = visitpad_procedure_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = str(pl.cpt_code)
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "cpt_code": pl.cpt_code,
                "short_name": pl.short_name,
                "official_descriptor": pl.official_descriptor.strip(),
                "display_name": pl.display_name.strip(),
                "category": pl.category.value,
                "billing_category": pl.billing_category.value,
                "duration_minutes": pl.duration_minutes,
                "requires_consent": pl.requires_consent,
                "type_modality": _norm_opt_str(pl.type_modality),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "snomed_code": _norm_opt_str(pl.snomed_code),
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "cpt_code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.cpt_code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_vaccines(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadVaccineCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: str(p.code))
    TenantM = visitpad_vaccine_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = str(pl.code)
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": pl.code,
                "short_name": _norm_opt_str(pl.short_name),
                "display_name": pl.display_name.strip(),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_manufacturers(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadManufacturerCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: str(p.code).lower())
    TenantM = visitpad_manufacturer_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = str(pl.code).lower()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": pl.code,
                "short_name": _norm_opt_str(pl.short_name),
                "display_name": pl.display_name.strip(),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]).lower(): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def _medicine_row(tenant_id: UUID, pl: VisitpadMedicineCreate, now: Any) -> dict[str, Any]:
    return {
        "id": uuid.uuid4(),
        "iq_tenant_id": tenant_id,
        "code": pl.code.strip(),
        "display_name": pl.display_name.strip(),
        "generic_name": pl.generic_name.strip(),
        "short_name": _norm_opt_str(pl.short_name),
        "brand_names": list(pl.brand_names),
        "drug_class": pl.drug_class.strip(),
        "drug_subclass": _norm_opt_str(pl.drug_subclass),
        "dosage_form": pl.dosage_form.strip(),
        "route_of_admin": list(pl.route_of_admin),
        "strength_value": pl.strength_value,
        "strength_unit": _norm_opt_str(pl.strength_unit),
        "strength_display": (pl.strength_display or "").strip(),
        "concentration_value": pl.concentration_value,
        "concentration_unit": _norm_opt_str(pl.concentration_unit),
        "volume_per_unit": pl.volume_per_unit,
        "sku_code": _norm_opt_str(pl.sku_code),
        "barcode": _norm_opt_str(pl.barcode),
        "pack_size": pl.pack_size,
        "pack_unit": _norm_opt_str(pl.pack_unit),
        "manufacturer": _norm_opt_str(pl.manufacturer),
        "storage_condition": _norm_opt_str(pl.storage_condition),
        "expiry_tracking": pl.expiry_tracking,
        "is_dispensable": pl.is_dispensable,
        "schedule": pl.schedule.value,
        "is_controlled_substance": pl.is_controlled_substance,
        "is_narcotic": pl.is_narcotic,
        "requires_prescription": pl.requires_prescription,
        "is_restricted_antibiotic": pl.is_restricted_antibiotic,
        "allergen_classes": list(pl.allergen_classes),
        "contraindications": list(pl.contraindications),
        "search_tags": list(pl.search_tags),
        "atc_code": _norm_opt_str(pl.atc_code),
        "rxnorm_code": _norm_opt_str(pl.rxnorm_code),
        "snomed_substance_code": _norm_opt_str(pl.snomed_substance_code),
        "snomed_product_code": _norm_opt_str(pl.snomed_product_code),
        "pregnancy_category": _norm_opt_str(pl.pregnancy_category),
        "lactation_safety": _norm_opt_str(pl.lactation_safety),
        "pediatric_use": _norm_opt_str(pl.pediatric_use),
        "max_dose_per_day_value": pl.max_dose_per_day_value,
        "max_dose_per_day_unit": _norm_opt_str(pl.max_dose_per_day_unit),
        "black_box_warning": pl.black_box_warning,
        "black_box_warning_text": _norm_opt_str(pl.black_box_warning_text),
        "default_dose_value": pl.default_dose_value,
        "default_dose_unit": _norm_opt_str(pl.default_dose_unit),
        "default_frequency": _norm_opt_str(pl.default_frequency),
        "default_duration_days": pl.default_duration_days,
        "default_route": _norm_opt_str(pl.default_route),
        "default_instructions": _norm_opt_str(pl.default_instructions),
        "typical_quantity": pl.typical_quantity,
        "notes": _norm_opt_str(pl.notes),
        "display_order": pl.display_order,
        "is_active": pl.is_active,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
        "created_by": None,
        "updated_by": None,
    }


def pg_import_medicines(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadMedicineCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_medicine_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        rows.append(_medicine_row(tenant_id, pl, now))
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_vitals(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadVitalCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(valid, key_fn=lambda p: p.code.strip())
    TenantM = visitpad_vital_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = pl.code.strip()
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "code": k,
                "name": pl.name.strip(),
                "short_name": pl.short_name.strip(),
                "category": pl.category.value,
                "data_type": pl.data_type.value,
                "unit": pl.unit.strip(),
                "default_unit_code": pl.default_unit_code.strip(),
                "allowed_units": list(pl.allowed_units),
                "critical_low": pl.critical_low,
                "critical_high": pl.critical_high,
                "reference_kind": pl.reference_kind.value,
                "reference_json": dict(pl.reference_json),
                "normal_range_adult": dict(pl.normal_range_adult),
                "normal_range_paediatric": dict(pl.normal_range_paediatric),
                "input_method": pl.input_method.value,
                "is_paired": pl.is_paired,
                "pair_code": _norm_opt_str(pl.pair_code),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "loinc_code": _norm_opt_str(pl.loinc_code),
                "snomed_observable_code": _norm_opt_str(pl.snomed_observable_code),
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.code),
    )
    key_to_id = {str(r[1]): r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_rx_columns(session: Session, scope: CatalogScope, valid: list[tuple[UUID, VisitpadRxColumnCreate]]) -> tuple[list[UUID], list[UUID]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    deduped, dup_skipped = dedupe_platform_ids_by_key(
        valid,
        key_fn=lambda p: f"{p.section.value}::{p.code.strip()}",
    )
    TenantM = visitpad_rx_column_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        k = f"{pl.section.value}::{pl.code.strip()}"
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "section": pl.section.value,
                "display_name": pl.display_name.strip(),
                "code": pl.code.strip(),
                "extra_unit": _norm_opt_str(pl.extra_unit),
                "display_order": pl.display_order,
                "is_active": pl.is_active,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "section", "code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.section, TenantM.code),
    )
    key_to_id = {f"{r[1]}::{r[2]}": r[0] for r in returned}
    return _partition_ids(keys_order, key_to_id, dup_skipped)


def pg_import_unit_conversions(
    session: Session,
    scope: CatalogScope,
    unit_repo: Any,
    valid: list[tuple[UUID, VisitpadUnitConversionCreate]],
) -> tuple[list[UUID], list[UUID], list[VisitpadPlatformImportErrorItem]]:
    tenant_id = scope.iq_tenant_id
    assert tenant_id is not None
    conv_errors: list[VisitpadPlatformImportErrorItem] = []
    checked: list[tuple[UUID, VisitpadUnitConversionCreate]] = []
    UM = visitpad_unit_model(unit_repo.scope)
    for pid, pl in valid:
        fc = pl.from_unit_code.strip().lower()
        tc = pl.to_unit_code.strip().lower()
        if fc == tc:
            conv_errors.append(
                VisitpadPlatformImportErrorItem(
                    platform_row_id=pid,
                    message="from_unit_code and to_unit_code must differ.",
                ),
            )
            continue
        checked.append((pid, pl))

    codes: set[str] = set()
    for _, pl in checked:
        codes.add(pl.from_unit_code.strip().lower())
        codes.add(pl.to_unit_code.strip().lower())
    present: set[str] = set()
    if codes:
        stmt = select(func.lower(UM.code)).where(
            UM.iq_tenant_id == tenant_id,
            UM.is_deleted.is_(False),
            UM.is_active.is_(True),
            func.lower(UM.code).in_(sorted(codes)),
        )
        present = {str(r[0]) for r in session.execute(stmt).all()}

    ok: list[tuple[UUID, VisitpadUnitConversionCreate]] = []
    for pid, pl in checked:
        fc = pl.from_unit_code.strip().lower()
        tc = pl.to_unit_code.strip().lower()
        missing = [c for c in (fc, tc) if c not in present]
        if missing:
            conv_errors.append(
                VisitpadPlatformImportErrorItem(
                    platform_row_id=pid,
                    message=f"No active unit with code {missing[0]!r} for this catalog scope.",
                ),
            )
            continue
        ok.append((pid, pl))

    deduped, dup_skipped = dedupe_platform_ids_by_key(
        ok,
        key_fn=lambda p: f"{p.from_unit_code.strip().lower()}→{p.to_unit_code.strip().lower()}",
    )
    TenantM = visitpad_unit_conversion_model(scope)
    now, _ = utc_now_pair()
    rows: list[dict[str, Any]] = []
    keys_order: list[tuple[UUID, str]] = []
    for pid, pl in deduped:
        fc = pl.from_unit_code.strip().lower()
        tc = pl.to_unit_code.strip().lower()
        k = f"{fc}→{tc}"
        keys_order.append((pid, k))
        rows.append(
            {
                "id": uuid.uuid4(),
                "iq_tenant_id": tenant_id,
                "from_unit_code": fc,
                "to_unit_code": tc,
                "factor": pl.factor,
                "offset_value": pl.offset_value,
                "display_order": pl.display_order,
                "is_deleted": False,
                "created_at": now,
                "updated_at": now,
                "created_by": None,
                "updated_by": None,
            },
        )
    if not rows:
        return [], dup_skipped, conv_errors
    returned = pg_bulk_insert_ignore_returning(
        session,
        TenantM,
        rows,
        index_elements=["iq_tenant_id", "from_unit_code", "to_unit_code"],
        index_where=sa_text("NOT is_deleted"),
        returning_cols=(TenantM.id, TenantM.from_unit_code, TenantM.to_unit_code),
    )
    key_to_id = {f"{r[1]}→{r[2]}": r[0] for r in returned}
    created, skipped = _partition_ids(keys_order, key_to_id, dup_skipped)
    return created, skipped, conv_errors

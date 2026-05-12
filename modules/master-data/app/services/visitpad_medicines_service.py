"""Visitpad — medicines use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad_table_models import visitpad_medicine_model
from app.repositories.visitpad_medicine_repository import VisitpadMedicineRepository
from app.schemas.visitpad_medicine import VisitpadMedicineCreate, VisitpadMedicineUpdate


def _norm_opt_str(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


def list_visitpad_medicines(
    repository: VisitpadMedicineRepository,
    *,
    search: str | None,
    schedule: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Any], int]:
    return repository.list_medicines(
        search=search,
        schedule=schedule,
        limit=limit,
        offset=offset,
    )


def create_visitpad_medicine(
    repository: VisitpadMedicineRepository,
    *,
    payload: VisitpadMedicineCreate,
) -> Any:
    M = visitpad_medicine_model(repository.scope)
    common = dict(
        id=uuid.uuid4(),
        code=payload.code.strip(),
        display_name=payload.display_name.strip(),
        generic_name=payload.generic_name.strip(),
        short_name=_norm_opt_str(payload.short_name),
        brand_names=list(payload.brand_names),
        drug_class=payload.drug_class.strip(),
        drug_subclass=_norm_opt_str(payload.drug_subclass),
        dosage_form=payload.dosage_form.strip(),
        route_of_admin=list(payload.route_of_admin),
        strength_value=payload.strength_value,
        strength_unit=_norm_opt_str(payload.strength_unit),
        strength_display=(payload.strength_display or "").strip(),
        concentration_value=payload.concentration_value,
        concentration_unit=_norm_opt_str(payload.concentration_unit),
        volume_per_unit=payload.volume_per_unit,
        sku_code=_norm_opt_str(payload.sku_code),
        barcode=_norm_opt_str(payload.barcode),
        pack_size=payload.pack_size,
        pack_unit=_norm_opt_str(payload.pack_unit),
        manufacturer=_norm_opt_str(payload.manufacturer),
        storage_condition=_norm_opt_str(payload.storage_condition),
        expiry_tracking=payload.expiry_tracking,
        is_dispensable=payload.is_dispensable,
        schedule=payload.schedule.value,
        is_controlled_substance=payload.is_controlled_substance,
        is_narcotic=payload.is_narcotic,
        requires_prescription=payload.requires_prescription,
        is_restricted_antibiotic=payload.is_restricted_antibiotic,
        allergen_classes=list(payload.allergen_classes),
        contraindications=list(payload.contraindications),
        search_tags=list(payload.search_tags),
        atc_code=_norm_opt_str(payload.atc_code),
        rxnorm_code=_norm_opt_str(payload.rxnorm_code),
        snomed_substance_code=_norm_opt_str(payload.snomed_substance_code),
        snomed_product_code=_norm_opt_str(payload.snomed_product_code),
        pregnancy_category=_norm_opt_str(payload.pregnancy_category),
        lactation_safety=_norm_opt_str(payload.lactation_safety),
        pediatric_use=_norm_opt_str(payload.pediatric_use),
        max_dose_per_day_value=payload.max_dose_per_day_value,
        max_dose_per_day_unit=_norm_opt_str(payload.max_dose_per_day_unit),
        black_box_warning=payload.black_box_warning,
        black_box_warning_text=_norm_opt_str(payload.black_box_warning_text),
        default_dose_value=payload.default_dose_value,
        default_dose_unit=_norm_opt_str(payload.default_dose_unit),
        default_frequency=_norm_opt_str(payload.default_frequency),
        default_duration_days=payload.default_duration_days,
        default_route=_norm_opt_str(payload.default_route),
        default_instructions=_norm_opt_str(payload.default_instructions),
        typical_quantity=payload.typical_quantity,
        notes=_norm_opt_str(payload.notes),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(tenant_id=repository.scope.tenant_id, **common)
    else:
        row = M(**common)
    return repository.create(row)


def get_visitpad_medicine_by_id(
    repository: VisitpadMedicineRepository,
    *,
    row_id: UUID,
) -> Any | None:
    return repository.get_by_id(row_id)


def update_visitpad_medicine(
    repository: VisitpadMedicineRepository,
    *,
    row_id: UUID,
    payload: VisitpadMedicineUpdate,
) -> Any | None:
    row = repository.get_by_id(row_id, include_deleted=True)
    if row is None:
        return None
    if repository.scope.is_tenant and row.tenant_id != repository.scope.tenant_id:
        return None
    if payload.code is not None:
        row.code = payload.code.strip()
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if payload.generic_name is not None:
        row.generic_name = payload.generic_name.strip()
    if payload.short_name is not None:
        row.short_name = _norm_opt_str(payload.short_name)
    if payload.brand_names is not None:
        row.brand_names = list(payload.brand_names)
    if payload.drug_class is not None:
        row.drug_class = payload.drug_class.strip()
    if payload.drug_subclass is not None:
        row.drug_subclass = _norm_opt_str(payload.drug_subclass)
    if payload.dosage_form is not None:
        row.dosage_form = payload.dosage_form.strip()
    if payload.route_of_admin is not None:
        row.route_of_admin = list(payload.route_of_admin)
    if payload.strength_value is not None:
        row.strength_value = payload.strength_value
    if payload.strength_unit is not None:
        row.strength_unit = _norm_opt_str(payload.strength_unit)
    if payload.strength_display is not None:
        row.strength_display = payload.strength_display.strip()
    if payload.concentration_value is not None:
        row.concentration_value = payload.concentration_value
    if payload.concentration_unit is not None:
        row.concentration_unit = _norm_opt_str(payload.concentration_unit)
    if payload.volume_per_unit is not None:
        row.volume_per_unit = payload.volume_per_unit
    if payload.sku_code is not None:
        row.sku_code = _norm_opt_str(payload.sku_code)
    if payload.barcode is not None:
        row.barcode = _norm_opt_str(payload.barcode)
    if payload.pack_size is not None:
        row.pack_size = payload.pack_size
    if payload.pack_unit is not None:
        row.pack_unit = _norm_opt_str(payload.pack_unit)
    if payload.manufacturer is not None:
        row.manufacturer = _norm_opt_str(payload.manufacturer)
    if payload.storage_condition is not None:
        row.storage_condition = _norm_opt_str(payload.storage_condition)
    if payload.expiry_tracking is not None:
        row.expiry_tracking = payload.expiry_tracking
    if payload.is_dispensable is not None:
        row.is_dispensable = payload.is_dispensable
    if payload.schedule is not None:
        row.schedule = payload.schedule.value
    if payload.is_controlled_substance is not None:
        row.is_controlled_substance = payload.is_controlled_substance
    if payload.is_narcotic is not None:
        row.is_narcotic = payload.is_narcotic
    if payload.requires_prescription is not None:
        row.requires_prescription = payload.requires_prescription
    if payload.is_restricted_antibiotic is not None:
        row.is_restricted_antibiotic = payload.is_restricted_antibiotic
    if payload.allergen_classes is not None:
        row.allergen_classes = list(payload.allergen_classes)
    if payload.contraindications is not None:
        row.contraindications = list(payload.contraindications)
    if payload.search_tags is not None:
        row.search_tags = list(payload.search_tags)
    if payload.atc_code is not None:
        row.atc_code = _norm_opt_str(payload.atc_code)
    if payload.rxnorm_code is not None:
        row.rxnorm_code = _norm_opt_str(payload.rxnorm_code)
    if payload.snomed_substance_code is not None:
        row.snomed_substance_code = _norm_opt_str(payload.snomed_substance_code)
    if payload.snomed_product_code is not None:
        row.snomed_product_code = _norm_opt_str(payload.snomed_product_code)
    if payload.pregnancy_category is not None:
        row.pregnancy_category = _norm_opt_str(payload.pregnancy_category)
    if payload.lactation_safety is not None:
        row.lactation_safety = _norm_opt_str(payload.lactation_safety)
    if payload.pediatric_use is not None:
        row.pediatric_use = _norm_opt_str(payload.pediatric_use)
    if payload.max_dose_per_day_value is not None:
        row.max_dose_per_day_value = payload.max_dose_per_day_value
    if payload.max_dose_per_day_unit is not None:
        row.max_dose_per_day_unit = _norm_opt_str(payload.max_dose_per_day_unit)
    if payload.black_box_warning is not None:
        row.black_box_warning = payload.black_box_warning
    if payload.black_box_warning_text is not None:
        row.black_box_warning_text = _norm_opt_str(payload.black_box_warning_text)
    if payload.default_dose_value is not None:
        row.default_dose_value = payload.default_dose_value
    if payload.default_dose_unit is not None:
        row.default_dose_unit = _norm_opt_str(payload.default_dose_unit)
    if payload.default_frequency is not None:
        row.default_frequency = _norm_opt_str(payload.default_frequency)
    if payload.default_duration_days is not None:
        row.default_duration_days = payload.default_duration_days
    if payload.default_route is not None:
        row.default_route = _norm_opt_str(payload.default_route)
    if payload.default_instructions is not None:
        row.default_instructions = _norm_opt_str(payload.default_instructions)
    if payload.typical_quantity is not None:
        row.typical_quantity = payload.typical_quantity
    if payload.notes is not None:
        row.notes = _norm_opt_str(payload.notes)
    if payload.display_order is not None:
        row.display_order = payload.display_order
    if payload.is_active is not None:
        row.is_active = payload.is_active
    if payload.is_deleted is not None:
        row.is_deleted = payload.is_deleted
    return repository.update(row)


def soft_delete_visitpad_medicine(
    repository: VisitpadMedicineRepository,
    *,
    row_id: UUID,
) -> Any | None:
    row = repository.get_by_id(row_id)
    if row is None:
        return None
    row.is_deleted = True
    return repository.update(row)

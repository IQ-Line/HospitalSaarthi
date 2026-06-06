"""Visitpad — medicines use-cases."""

from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from app.catalog.visitpad.table_models import visitpad_medicine_model
from app.repositories.visitpad.medicine import VisitpadMedicineRepository
from app.schemas.visitpad.medicine import VisitpadMedicineCreate, VisitpadMedicineUpdate


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
        price=payload.price,
        notes=_norm_opt_str(payload.notes),
        display_order=payload.display_order,
        is_active=payload.is_active,
        is_deleted=False,
    )
    if repository.scope.is_tenant:
        row = M(iq_tenant_id=repository.scope.iq_tenant_id, **common)
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
    if repository.scope.is_tenant and row.iq_tenant_id != repository.scope.iq_tenant_id:
        return None

    dump = payload.model_dump(exclude_unset=True)

    if "display_name" in dump and payload.display_name is not None:
        row.display_name = payload.display_name.strip()
    if "generic_name" in dump and payload.generic_name is not None:
        row.generic_name = payload.generic_name.strip()
    if "short_name" in dump:
        row.short_name = _norm_opt_str(payload.short_name)
    if "brand_names" in dump:
        row.brand_names = [] if payload.brand_names is None else list(payload.brand_names)
    if "drug_class" in dump and payload.drug_class is not None:
        row.drug_class = payload.drug_class.strip()
    if "drug_subclass" in dump:
        row.drug_subclass = _norm_opt_str(payload.drug_subclass)
    if "dosage_form" in dump and payload.dosage_form is not None:
        row.dosage_form = payload.dosage_form.strip()
    if "route_of_admin" in dump:
        row.route_of_admin = [] if payload.route_of_admin is None else list(payload.route_of_admin)
    if "strength_value" in dump:
        row.strength_value = payload.strength_value
    if "strength_unit" in dump:
        row.strength_unit = _norm_opt_str(payload.strength_unit)
    if "strength_display" in dump:
        row.strength_display = (payload.strength_display or "").strip()
    if "concentration_value" in dump:
        row.concentration_value = payload.concentration_value
    if "concentration_unit" in dump:
        row.concentration_unit = _norm_opt_str(payload.concentration_unit)
    if "volume_per_unit" in dump:
        row.volume_per_unit = payload.volume_per_unit
    if "sku_code" in dump:
        row.sku_code = _norm_opt_str(payload.sku_code)
    if "barcode" in dump:
        row.barcode = _norm_opt_str(payload.barcode)
    if "pack_size" in dump:
        row.pack_size = payload.pack_size
    if "pack_unit" in dump:
        row.pack_unit = _norm_opt_str(payload.pack_unit)
    if "manufacturer" in dump:
        row.manufacturer = _norm_opt_str(payload.manufacturer)
    if "storage_condition" in dump:
        row.storage_condition = _norm_opt_str(payload.storage_condition)
    if "expiry_tracking" in dump and payload.expiry_tracking is not None:
        row.expiry_tracking = payload.expiry_tracking
    if "is_dispensable" in dump and payload.is_dispensable is not None:
        row.is_dispensable = payload.is_dispensable
    if "schedule" in dump and payload.schedule is not None:
        row.schedule = payload.schedule.value
    if "is_controlled_substance" in dump and payload.is_controlled_substance is not None:
        row.is_controlled_substance = payload.is_controlled_substance
    if "is_narcotic" in dump and payload.is_narcotic is not None:
        row.is_narcotic = payload.is_narcotic
    if "requires_prescription" in dump and payload.requires_prescription is not None:
        row.requires_prescription = payload.requires_prescription
    if "is_restricted_antibiotic" in dump and payload.is_restricted_antibiotic is not None:
        row.is_restricted_antibiotic = payload.is_restricted_antibiotic
    if "allergen_classes" in dump:
        row.allergen_classes = [] if payload.allergen_classes is None else list(payload.allergen_classes)
    if "contraindications" in dump:
        row.contraindications = [] if payload.contraindications is None else list(payload.contraindications)
    if "search_tags" in dump:
        row.search_tags = [] if payload.search_tags is None else list(payload.search_tags)
    if "atc_code" in dump:
        row.atc_code = _norm_opt_str(payload.atc_code)
    if "rxnorm_code" in dump:
        row.rxnorm_code = _norm_opt_str(payload.rxnorm_code)
    if "snomed_substance_code" in dump:
        row.snomed_substance_code = _norm_opt_str(payload.snomed_substance_code)
    if "snomed_product_code" in dump:
        row.snomed_product_code = _norm_opt_str(payload.snomed_product_code)
    if "pregnancy_category" in dump:
        row.pregnancy_category = _norm_opt_str(payload.pregnancy_category)
    if "lactation_safety" in dump:
        row.lactation_safety = _norm_opt_str(payload.lactation_safety)
    if "pediatric_use" in dump:
        row.pediatric_use = _norm_opt_str(payload.pediatric_use)
    if "max_dose_per_day_value" in dump:
        row.max_dose_per_day_value = payload.max_dose_per_day_value
    if "max_dose_per_day_unit" in dump:
        row.max_dose_per_day_unit = _norm_opt_str(payload.max_dose_per_day_unit)
    if "black_box_warning" in dump and payload.black_box_warning is not None:
        row.black_box_warning = payload.black_box_warning
    if "black_box_warning_text" in dump:
        row.black_box_warning_text = _norm_opt_str(payload.black_box_warning_text)
    if "default_dose_value" in dump:
        row.default_dose_value = payload.default_dose_value
    if "default_dose_unit" in dump:
        row.default_dose_unit = _norm_opt_str(payload.default_dose_unit)
    if "default_frequency" in dump:
        row.default_frequency = _norm_opt_str(payload.default_frequency)
    if "default_duration_days" in dump:
        row.default_duration_days = payload.default_duration_days
    if "default_route" in dump:
        row.default_route = _norm_opt_str(payload.default_route)
    if "default_instructions" in dump:
        row.default_instructions = _norm_opt_str(payload.default_instructions)
    if "typical_quantity" in dump:
        row.typical_quantity = payload.typical_quantity
    if "price" in dump:
        row.price = payload.price
    if "notes" in dump:
        row.notes = _norm_opt_str(payload.notes)
    if "display_order" in dump and payload.display_order is not None:
        row.display_order = payload.display_order
    if "is_active" in dump and payload.is_active is not None:
        row.is_active = payload.is_active
    if "is_deleted" in dump and payload.is_deleted is not None:
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

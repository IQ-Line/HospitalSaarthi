"""Pydantic payloads for Visitpad medicines."""

from datetime import datetime
from enum import StrEnum
from typing import Any, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.visitpad._code import VISITPAD_CATALOG_CODE_PATTERN


class VisitpadMedicineSchedule(StrEnum):
    otc = "otc"
    h = "h"
    h1 = "h1"
    s = "s"
    x = "x"
    unscheduled = "unscheduled"


class VisitpadMedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    code: str
    display_name: str
    generic_name: str
    short_name: str | None = None
    brand_names: list[Any]
    drug_class: str
    drug_subclass: str | None = None
    dosage_form: str
    route_of_admin: list[Any]
    strength_value: float | None = None
    strength_unit: str | None = None
    strength_display: str
    concentration_value: float | None = None
    concentration_unit: str | None = None
    volume_per_unit: float | None = None
    sku_code: str | None = None
    barcode: str | None = None
    pack_size: int | None = None
    pack_unit: str | None = None
    manufacturer: str | None = None
    storage_condition: str | None = None
    expiry_tracking: bool
    is_dispensable: bool
    schedule: VisitpadMedicineSchedule
    is_controlled_substance: bool
    is_narcotic: bool
    requires_prescription: bool
    is_restricted_antibiotic: bool
    allergen_classes: list[Any]
    contraindications: list[Any]
    search_tags: list[Any]
    atc_code: str | None = None
    rxnorm_code: str | None = None
    snomed_substance_code: str | None = None
    snomed_product_code: str | None = None
    pregnancy_category: str | None = None
    lactation_safety: str | None = None
    pediatric_use: str | None = None
    max_dose_per_day_value: float | None = None
    max_dose_per_day_unit: str | None = None
    black_box_warning: bool
    black_box_warning_text: str | None = None
    default_dose_value: float | None = None
    default_dose_unit: str | None = None
    default_frequency: str | None = None
    default_duration_days: int | None = None
    default_route: str | None = None
    default_instructions: str | None = None
    typical_quantity: float | None = None
    notes: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadMedicineListResponse(BaseModel):
    data: list[VisitpadMedicineResponse]
    total: int


class VisitpadMedicineSingleResponse(BaseModel):
    data: VisitpadMedicineResponse


class VisitpadMedicineCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=3, max_length=9, pattern=VISITPAD_CATALOG_CODE_PATTERN)
    display_name: str = Field(min_length=1, max_length=512)
    generic_name: str | None = Field(default=None, max_length=512)
    short_name: str | None = Field(default=None, max_length=256)
    brand_names: list[str] = Field(default_factory=list, max_length=50)
    drug_class: str | None = Field(default=None, max_length=256)
    drug_subclass: str | None = Field(default=None, max_length=256)
    dosage_form: str | None = Field(default=None, max_length=128)
    route_of_admin: list[str] = Field(default_factory=list, max_length=20)
    strength_value: float | None = None
    strength_unit: str | None = Field(default=None, max_length=32)
    strength_display: str = Field(default="", max_length=256)
    concentration_value: float | None = None
    concentration_unit: str | None = Field(default=None, max_length=32)
    volume_per_unit: float | None = None
    sku_code: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    pack_size: int | None = None
    pack_unit: str | None = Field(default=None, max_length=32)
    manufacturer: str | None = Field(default=None, max_length=256)
    storage_condition: str | None = Field(default=None, max_length=64)
    expiry_tracking: bool = False
    is_dispensable: bool = True
    schedule: VisitpadMedicineSchedule = VisitpadMedicineSchedule.otc
    is_controlled_substance: bool = False
    is_narcotic: bool = False
    requires_prescription: bool = False
    is_restricted_antibiotic: bool = False
    allergen_classes: list[str] = Field(default_factory=list, max_length=50)
    contraindications: list[str] = Field(default_factory=list, max_length=50)
    search_tags: list[str] = Field(default_factory=list, max_length=50)
    atc_code: str | None = Field(default=None, max_length=32)
    rxnorm_code: str | None = Field(default=None, max_length=32)
    snomed_substance_code: str | None = Field(default=None, max_length=64)
    snomed_product_code: str | None = Field(default=None, max_length=64)
    pregnancy_category: str | None = Field(default=None, max_length=8)
    lactation_safety: str | None = Field(default=None, max_length=32)
    pediatric_use: str | None = Field(default=None, max_length=32)
    max_dose_per_day_value: float | None = None
    max_dose_per_day_unit: str | None = Field(default=None, max_length=32)
    black_box_warning: bool = False
    black_box_warning_text: str | None = Field(default=None, max_length=2048)
    default_dose_value: float | None = None
    default_dose_unit: str | None = Field(default=None, max_length=32)
    default_frequency: str | None = Field(default=None, max_length=64)
    default_duration_days: int | None = None
    default_route: str | None = Field(default=None, max_length=64)
    default_instructions: str | None = Field(default=None, max_length=1024)
    typical_quantity: float | None = None
    notes: str | None = Field(default=None, max_length=2048)
    display_order: int = 0
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @model_validator(mode="after")
    def _apply_create_defaults(self) -> Self:
        dn = self.display_name.strip()
        if not (self.generic_name or "").strip():
            object.__setattr__(self, "generic_name", dn)
        if not (self.drug_class or "").strip():
            object.__setattr__(self, "drug_class", "")
        if not (self.dosage_form or "").strip():
            object.__setattr__(self, "dosage_form", "")
        return self


class VisitpadMedicineUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    generic_name: str | None = Field(default=None, min_length=1, max_length=512)
    short_name: str | None = Field(default=None, max_length=256)
    brand_names: list[str] | None = Field(default=None, max_length=50)
    drug_class: str | None = Field(default=None, min_length=1, max_length=256)
    drug_subclass: str | None = Field(default=None, max_length=256)
    dosage_form: str | None = Field(default=None, min_length=1, max_length=128)
    route_of_admin: list[str] | None = Field(default=None, max_length=20)
    strength_value: float | None = None
    strength_unit: str | None = Field(default=None, max_length=32)
    strength_display: str | None = Field(default=None, max_length=256)
    concentration_value: float | None = None
    concentration_unit: str | None = Field(default=None, max_length=32)
    volume_per_unit: float | None = None
    sku_code: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    pack_size: int | None = None
    pack_unit: str | None = Field(default=None, max_length=32)
    manufacturer: str | None = Field(default=None, max_length=256)
    storage_condition: str | None = Field(default=None, max_length=64)
    expiry_tracking: bool | None = None
    is_dispensable: bool | None = None
    schedule: VisitpadMedicineSchedule | None = None
    is_controlled_substance: bool | None = None
    is_narcotic: bool | None = None
    requires_prescription: bool | None = None
    is_restricted_antibiotic: bool | None = None
    allergen_classes: list[str] | None = Field(default=None, max_length=50)
    contraindications: list[str] | None = Field(default=None, max_length=50)
    search_tags: list[str] | None = Field(default=None, max_length=50)
    atc_code: str | None = Field(default=None, max_length=32)
    rxnorm_code: str | None = Field(default=None, max_length=32)
    snomed_substance_code: str | None = Field(default=None, max_length=64)
    snomed_product_code: str | None = Field(default=None, max_length=64)
    pregnancy_category: str | None = Field(default=None, max_length=8)
    lactation_safety: str | None = Field(default=None, max_length=32)
    pediatric_use: str | None = Field(default=None, max_length=32)
    max_dose_per_day_value: float | None = None
    max_dose_per_day_unit: str | None = Field(default=None, max_length=32)
    black_box_warning: bool | None = None
    black_box_warning_text: str | None = Field(default=None, max_length=2048)
    default_dose_value: float | None = None
    default_dose_unit: str | None = Field(default=None, max_length=32)
    default_frequency: str | None = Field(default=None, max_length=64)
    default_duration_days: int | None = None
    default_route: str | None = Field(default=None, max_length=64)
    default_instructions: str | None = Field(default=None, max_length=1024)
    typical_quantity: float | None = None
    notes: str | None = Field(default=None, max_length=2048)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

"""Pydantic payloads for Visitpad vitals."""

from datetime import datetime
from enum import StrEnum
from typing import Any, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VisitpadVitalCategory(StrEnum):
    vital_signs = "vital_signs"
    anthropometric = "anthropometric"
    functional = "functional"
    score = "score"
    other = "other"


class VisitpadVitalDataType(StrEnum):
    numeric = "numeric"
    text = "text"
    boolean = "boolean"
    score = "score"


class VisitpadVitalReferenceKind(StrEnum):
    none = "none"
    range = "range"
    categorical = "categorical"
    boolean = "boolean"


class VisitpadVitalInputMethod(StrEnum):
    manual = "manual"
    device = "device"
    calculated = "calculated"


class VisitpadVitalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    code: str
    name: str
    short_name: str
    category: VisitpadVitalCategory
    data_type: VisitpadVitalDataType
    unit: str
    default_unit_code: str
    allowed_units: list[Any]
    critical_low: float | None = None
    critical_high: float | None = None
    reference_kind: VisitpadVitalReferenceKind
    reference_json: dict[str, Any]
    normal_range_adult: dict[str, Any]
    normal_range_paediatric: dict[str, Any]
    input_method: VisitpadVitalInputMethod
    is_paired: bool
    pair_code: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    loinc_code: str | None = None
    snomed_observable_code: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadVitalListResponse(BaseModel):
    data: list[VisitpadVitalResponse]
    total: int


class VisitpadVitalSingleResponse(BaseModel):
    data: VisitpadVitalResponse


class VisitpadVitalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=256)
    short_name: str = Field(min_length=1, max_length=64)
    category: VisitpadVitalCategory
    data_type: VisitpadVitalDataType
    unit: str = Field(min_length=1, max_length=128)
    default_unit_code: str = Field(min_length=1, max_length=64)
    allowed_units: list[str] = Field(default_factory=list, max_length=32)
    critical_low: float | None = None
    critical_high: float | None = None
    reference_kind: VisitpadVitalReferenceKind
    reference_json: dict[str, Any] = Field(default_factory=dict)
    normal_range_adult: dict[str, Any] = Field(default_factory=dict)
    normal_range_paediatric: dict[str, Any] = Field(default_factory=dict)
    input_method: VisitpadVitalInputMethod
    is_paired: bool = False
    pair_code: str | None = Field(default=None, max_length=64)
    display_order: int = 0
    is_active: bool = True
    loinc_code: str | None = Field(default=None, max_length=32)
    snomed_observable_code: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def _critical_order(self) -> Self:
        if self.critical_low is not None and self.critical_high is not None:
            if self.critical_low > self.critical_high:
                raise ValueError("critical_low must be less than or equal to critical_high.")
        return self


class VisitpadVitalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    short_name: str | None = Field(default=None, min_length=1, max_length=64)
    category: VisitpadVitalCategory | None = None
    data_type: VisitpadVitalDataType | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=128)
    default_unit_code: str | None = Field(default=None, min_length=1, max_length=64)
    allowed_units: list[str] | None = Field(default=None, max_length=32)
    critical_low: float | None = None
    critical_high: float | None = None
    reference_kind: VisitpadVitalReferenceKind | None = None
    reference_json: dict[str, Any] | None = None
    normal_range_adult: dict[str, Any] | None = None
    normal_range_paediatric: dict[str, Any] | None = None
    input_method: VisitpadVitalInputMethod | None = None
    is_paired: bool | None = None
    pair_code: str | None = Field(default=None, max_length=64)
    display_order: int | None = None
    is_active: bool | None = None
    loinc_code: str | None = Field(default=None, max_length=32)
    snomed_observable_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _critical_order(self) -> Self:
        lo = self.critical_low
        hi = self.critical_high
        if lo is not None and hi is not None and lo > hi:
            raise ValueError("critical_low must be less than or equal to critical_high.")
        return self

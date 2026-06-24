"""Pydantic payloads for Visitpad procedures."""

import re
from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_PROCEDURE_CATALOG_CODE = re.compile(r"^[A-Za-z0-9_]{3,9}$")


class VisitpadProcedureCategory(StrEnum):
    diagnostic = "diagnostic"
    therapeutic = "therapeutic"
    surgical = "surgical"
    ancillary = "ancillary"
    other = "other"


class VisitpadProcedureBillingCategory(StrEnum):
    professional = "professional"
    facility = "facility"
    ancillary = "ancillary"
    bundled = "bundled"
    other = "other"


class VisitpadProcedureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    cpt_code: str
    short_name: str | None = None
    official_descriptor: str
    display_name: str
    category: VisitpadProcedureCategory
    billing_category: VisitpadProcedureBillingCategory
    duration_minutes: int
    requires_consent: bool
    type_modality: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    snomed_code: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadProcedureListResponse(BaseModel):
    data: list[VisitpadProcedureResponse]
    total: int


class VisitpadProcedureSingleResponse(BaseModel):
    data: VisitpadProcedureResponse


class VisitpadProcedureCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cpt_code: str = Field(
        description=(
            "Tenant-unique procedure catalog code "
            "(legacy Integrator “procedure code”; not AMA CPT)."
        ),
    )
    short_name: str | None = Field(default=None, max_length=64)
    official_descriptor: str | None = Field(default=None, max_length=512)
    display_name: str = Field(min_length=1, max_length=512)
    category: VisitpadProcedureCategory = VisitpadProcedureCategory.other
    billing_category: VisitpadProcedureBillingCategory = VisitpadProcedureBillingCategory.other
    duration_minutes: int = Field(default=0, ge=0, le=24 * 60)
    requires_consent: bool = False
    type_modality: str | None = Field(default=None, max_length=128)
    display_order: int = 0
    is_active: bool = True
    snomed_code: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def _descriptor_default(self) -> Self:
        if not (self.official_descriptor or "").strip():
            object.__setattr__(self, "official_descriptor", self.display_name.strip())
        return self

    @field_validator("cpt_code", mode="before")
    @classmethod
    def validate_procedure_catalog_code(cls, v: object) -> str:
        if not isinstance(v, str):
            msg = "Procedure code must be a string."
            raise TypeError(msg)
        s = v.strip()
        if not _PROCEDURE_CATALOG_CODE.fullmatch(s):
            msg = "Procedure code must be 3–9 characters: letters, digits, or underscores."
            raise ValueError(msg)
        return s

    @field_validator("short_name", "type_modality", "snomed_code", mode="before")
    @classmethod
    def strip_optional_str(cls, v: object) -> object:
        if v is None:
            return None
        if not isinstance(v, str):
            return v
        t = v.strip()
        return t if t else None


class VisitpadProcedureUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    short_name: str | None = Field(default=None, max_length=64)
    official_descriptor: str | None = Field(default=None, min_length=1, max_length=512)
    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    category: VisitpadProcedureCategory | None = None
    billing_category: VisitpadProcedureBillingCategory | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    requires_consent: bool | None = None
    type_modality: str | None = Field(default=None, max_length=128)
    display_order: int | None = None
    is_active: bool | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

    @field_validator("short_name", "type_modality", "snomed_code", mode="before")
    @classmethod
    def strip_optional_str(cls, v: object) -> object:
        if v is None:
            return None
        if not isinstance(v, str):
            return v
        t = v.strip()
        return t if t else None

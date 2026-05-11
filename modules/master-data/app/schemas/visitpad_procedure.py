"""Pydantic payloads for Visitpad procedures."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    tenant_id: UUID
    cpt_code: str
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
    created_at: datetime
    updated_at: datetime


class VisitpadProcedureListResponse(BaseModel):
    data: list[VisitpadProcedureResponse]
    total: int


class VisitpadProcedureSingleResponse(BaseModel):
    data: VisitpadProcedureResponse


class VisitpadProcedureCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cpt_code: str = Field(min_length=1, max_length=16)
    official_descriptor: str = Field(min_length=1, max_length=512)
    display_name: str = Field(min_length=1, max_length=512)
    category: VisitpadProcedureCategory
    billing_category: VisitpadProcedureBillingCategory
    duration_minutes: int = Field(ge=0, le=24 * 60)
    requires_consent: bool = False
    type_modality: str | None = Field(default=None, max_length=128)
    display_order: int = 0
    is_active: bool = True
    snomed_code: str | None = Field(default=None, max_length=64)


class VisitpadProcedureUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cpt_code: str | None = Field(default=None, min_length=1, max_length=16)
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

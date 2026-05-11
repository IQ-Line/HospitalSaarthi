"""Pydantic payloads for Visitpad chronic illnesses."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VisitpadChronicIllnessCategory(StrEnum):
    cardiovascular = "cardiovascular"
    respiratory = "respiratory"
    metabolic = "metabolic"
    renal = "renal"
    neurological = "neurological"
    other = "other"


class VisitpadChronicIllnessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    display_name: str
    icd10_code: str
    category: VisitpadChronicIllnessCategory
    snomed_code: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class VisitpadChronicIllnessListResponse(BaseModel):
    data: list[VisitpadChronicIllnessResponse]
    total: int


class VisitpadChronicIllnessSingleResponse(BaseModel):
    data: VisitpadChronicIllnessResponse


class VisitpadChronicIllnessCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=512)
    icd10_code: str = Field(min_length=1, max_length=16)
    category: VisitpadChronicIllnessCategory
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int = 0
    is_active: bool = True


class VisitpadChronicIllnessUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    icd10_code: str | None = Field(default=None, min_length=1, max_length=16)
    category: VisitpadChronicIllnessCategory | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

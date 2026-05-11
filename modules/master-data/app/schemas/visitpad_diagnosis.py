"""Pydantic payloads for Visitpad diagnoses."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VisitpadDiagnosisCategory(StrEnum):
    general = "general"
    infectious = "infectious"
    neoplastic = "neoplastic"
    metabolic = "metabolic"
    psychiatric = "psychiatric"
    injury = "injury"
    other = "other"


class VisitpadIcdVersion(StrEnum):
    ICD_10 = "ICD-10"
    ICD_11 = "ICD-11"


class VisitpadDiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    icd10_code: str
    icd_version: VisitpadIcdVersion
    official_descriptor: str
    display_name: str
    category: VisitpadDiagnosisCategory
    is_chronic_flag: bool
    is_notifiable: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    snomed_code: str | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadDiagnosisListResponse(BaseModel):
    data: list[VisitpadDiagnosisResponse]
    total: int


class VisitpadDiagnosisSingleResponse(BaseModel):
    data: VisitpadDiagnosisResponse


class VisitpadDiagnosisCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    icd10_code: str = Field(min_length=1, max_length=16)
    icd_version: VisitpadIcdVersion
    official_descriptor: str = Field(min_length=1, max_length=512)
    display_name: str = Field(min_length=1, max_length=512)
    category: VisitpadDiagnosisCategory
    is_chronic_flag: bool = False
    is_notifiable: bool = False
    display_order: int = 0
    is_active: bool = True
    snomed_code: str | None = Field(default=None, max_length=64)


class VisitpadDiagnosisUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    icd10_code: str | None = Field(default=None, min_length=1, max_length=16)
    icd_version: VisitpadIcdVersion | None = None
    official_descriptor: str | None = Field(default=None, min_length=1, max_length=512)
    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    category: VisitpadDiagnosisCategory | None = None
    is_chronic_flag: bool | None = None
    is_notifiable: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

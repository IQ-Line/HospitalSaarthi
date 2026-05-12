"""Pydantic payloads for Visitpad diagnoses."""

from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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


_DIAGNOSIS_CODE_PATTERN = r"^[A-Za-z0-9_]{3,12}$"


class VisitpadDiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: int | None = None
    code: str
    short_name: str | None = None
    icd10_code: str | None = None
    icd_version: VisitpadIcdVersion | None = None
    official_descriptor: str | None = None
    display_name: str
    category: VisitpadDiagnosisCategory | None = None
    is_chronic_flag: bool
    is_notifiable: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    snomed_code: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadDiagnosisListResponse(BaseModel):
    data: list[VisitpadDiagnosisResponse]
    total: int


class VisitpadDiagnosisSingleResponse(BaseModel):
    data: VisitpadDiagnosisResponse


class VisitpadDiagnosisCreate(BaseModel):
    """Legacy-style row: ``code`` + ``display_name`` (+ optional SNOMED / flags). ICD block is optional."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=3, max_length=12, pattern=_DIAGNOSIS_CODE_PATTERN)
    display_name: str = Field(min_length=1, max_length=512)
    short_name: str | None = Field(default=None, max_length=120)
    snomed_code: str | None = Field(default=None, max_length=64)
    is_chronic_flag: bool = False
    is_notifiable: bool = False
    display_order: int = 0
    is_active: bool = True
    icd10_code: str | None = Field(default=None, max_length=16)
    icd_version: VisitpadIcdVersion | None = None
    official_descriptor: str | None = Field(default=None, max_length=512)
    category: VisitpadDiagnosisCategory | None = None

    @field_validator("code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @model_validator(mode="after")
    def _short_name_and_icd_block(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        has_icd = (
            (self.icd10_code is not None and self.icd10_code.strip() != "")
            or self.icd_version is not None
            or (self.official_descriptor is not None and self.official_descriptor.strip() != "")
            or self.category is not None
        )
        complete_icd = (
            self.icd10_code is not None
            and self.icd10_code.strip() != ""
            and self.icd_version is not None
            and self.official_descriptor is not None
            and self.official_descriptor.strip() != ""
            and self.category is not None
        )
        if has_icd and not complete_icd:
            raise ValueError(
                "When enriching with ICD, provide icd10_code, icd_version, official_descriptor, and category together.",
            )
        return self


class VisitpadDiagnosisUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    short_name: str | None = Field(default=None, max_length=120)
    icd10_code: str | None = Field(default=None, max_length=16)
    icd_version: VisitpadIcdVersion | None = None
    official_descriptor: str | None = Field(default=None, max_length=512)
    category: VisitpadDiagnosisCategory | None = None
    is_chronic_flag: bool | None = None
    is_notifiable: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _short_name_and_icd_block(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        icd_vals = (self.icd10_code, self.icd_version, self.official_descriptor, self.category)
        any_icd = self.icd10_code is not None or self.icd_version is not None
        any_icd = any_icd or self.official_descriptor is not None or self.category is not None
        if not any_icd:
            return self
        # Clearing entire ICD block: all four explicitly null
        if all(v is None for v in icd_vals):
            return self
        all_icd = (
            self.icd10_code is not None
            and self.icd10_code.strip() != ""
            and self.icd_version is not None
            and self.official_descriptor is not None
            and self.official_descriptor.strip() != ""
            and self.category is not None
        )
        if not all_icd:
            raise ValueError(
                "When updating ICD fields, set icd10_code, icd_version, official_descriptor, and category together "
                "(or set all four to null to clear ICD enrichment).",
            )
        return self

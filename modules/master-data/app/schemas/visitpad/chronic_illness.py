"""Pydantic payloads for Visitpad chronic illnesses."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.visitpad._code import VISITPAD_CATALOG_CODE_PATTERN


class VisitpadChronicIllnessCategory(StrEnum):
    autoimmune = "autoimmune"
    endocrine = "endocrine"
    cardiovascular = "cardiovascular"
    metabolic = "metabolic"
    neurological = "neurological"
    renal = "renal"
    respiratory = "respiratory"
    other = "other"


class VisitpadChronicIllnessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    display_name: str
    icd10_code: str
    category: VisitpadChronicIllnessCategory
    snomed_code: str | None = None
    chronic_illness_prompt: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
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
    icd10_code: str = Field(
        min_length=3,
        max_length=9,
        pattern=VISITPAD_CATALOG_CODE_PATTERN,
        description=(
            "Tenant-stable chronic illness code (legacy ``code`` / e.g. dm2). "
            "Stored in ``icd10_code`` column."
        ),
    )
    category: VisitpadChronicIllnessCategory = VisitpadChronicIllnessCategory.other
    snomed_code: str | None = Field(default=None, max_length=64)
    chronic_illness_prompt: bool = False
    display_order: int = 0
    is_active: bool = True

    @field_validator("icd10_code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class VisitpadChronicIllnessUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    category: VisitpadChronicIllnessCategory | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    chronic_illness_prompt: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

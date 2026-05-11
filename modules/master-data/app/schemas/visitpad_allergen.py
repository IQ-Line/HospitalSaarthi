"""Pydantic payloads for Visitpad allergens and allergy reactions."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VisitpadAllergenType(StrEnum):
    drug = "drug"
    food = "food"
    environmental = "environmental"
    other = "other"


class VisitpadReactionSeverityDefault(StrEnum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"
    unknown = "unknown"


class VisitpadAllergenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    display_name: str
    allergen_type: VisitpadAllergenType
    drug_class: str | None = None
    reaction_severity_default: VisitpadReactionSeverityDefault
    snomed_code: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class VisitpadAllergenListResponse(BaseModel):
    data: list[VisitpadAllergenResponse]
    total: int


class VisitpadAllergenSingleResponse(BaseModel):
    data: VisitpadAllergenResponse


class VisitpadAllergenCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=256)
    allergen_type: VisitpadAllergenType
    drug_class: str | None = Field(default=None, max_length=256)
    reaction_severity_default: VisitpadReactionSeverityDefault
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int = 0
    is_active: bool = True


class VisitpadAllergenUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    allergen_type: VisitpadAllergenType | None = None
    drug_class: str | None = Field(default=None, max_length=256)
    reaction_severity_default: VisitpadReactionSeverityDefault | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None


class VisitpadAllergyReactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    display_name: str
    code: str
    display_order: int
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class VisitpadAllergyReactionListResponse(BaseModel):
    data: list[VisitpadAllergyReactionResponse]
    total: int


class VisitpadAllergyReactionSingleResponse(BaseModel):
    data: VisitpadAllergyReactionResponse


class VisitpadAllergyReactionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=256)
    code: str = Field(min_length=1, max_length=64)
    display_order: int = 0
    is_active: bool = True


class VisitpadAllergyReactionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    code: str | None = Field(default=None, min_length=1, max_length=64)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

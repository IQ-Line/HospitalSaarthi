"""Pydantic payloads for Visitpad allergens and allergy reactions."""

from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


_ALLERGEN_CODE_PATTERN = r"^[A-Za-z0-9_]{3,8}$"
_REACTION_CODE_PATTERN = r"^[A-Za-z0-9_]{3,8}$"


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
    iq_tenant_id: int | None = None
    code: str
    display_name: str
    allergen_type: VisitpadAllergenType
    drug_class: str | None = None
    reaction_severity_default: VisitpadReactionSeverityDefault
    snomed_code: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadAllergenListResponse(BaseModel):
    data: list[VisitpadAllergenResponse]
    total: int


class VisitpadAllergenSingleResponse(BaseModel):
    data: VisitpadAllergenResponse


class VisitpadAllergenCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=3, max_length=8, pattern=_ALLERGEN_CODE_PATTERN)
    display_name: str = Field(min_length=1, max_length=256)
    allergen_type: VisitpadAllergenType
    drug_class: str | None = Field(default=None, max_length=256)
    reaction_severity_default: VisitpadReactionSeverityDefault = VisitpadReactionSeverityDefault.unknown
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int = 0
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class VisitpadAllergenUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
    iq_tenant_id: int | None = None
    display_name: str
    code: str
    short_name: str | None = None
    snomed_code: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
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
    code: str = Field(min_length=3, max_length=8, pattern=_REACTION_CODE_PATTERN)
    short_name: str | None = Field(default=None, max_length=120)
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int = 0
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @model_validator(mode="after")
    def _cap_short_name(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        return self


class VisitpadAllergyReactionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    short_name: str | None = Field(default=None, max_length=120)
    snomed_code: str | None = Field(default=None, max_length=64)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _cap_short_name(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        return self

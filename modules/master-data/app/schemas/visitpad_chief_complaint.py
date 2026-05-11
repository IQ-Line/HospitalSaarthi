"""Pydantic payloads for Visitpad chief complaints."""

from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VisitpadBodySystem(StrEnum):
    cardiovascular = "cardiovascular"
    respiratory = "respiratory"
    neurological = "neurological"
    gastrointestinal = "gastrointestinal"
    musculoskeletal = "musculoskeletal"
    ent = "ent"
    skin = "skin"
    psychiatric = "psychiatric"
    other = "other"


class VisitpadTriagePriority(StrEnum):
    urgent = "urgent"
    semi_urgent = "semi_urgent"
    non_urgent = "non_urgent"
    routine = "routine"


class VisitpadChiefComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    code: str
    display_name: str
    body_system: VisitpadBodySystem
    triage_priority: VisitpadTriagePriority
    synonyms: list[str]
    is_paediatric_relevant: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    snomed_code: str | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadChiefComplaintListResponse(BaseModel):
    data: list[VisitpadChiefComplaintResponse]
    total: int


class VisitpadChiefComplaintSingleResponse(BaseModel):
    data: VisitpadChiefComplaintResponse


class VisitpadChiefComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=256)
    body_system: VisitpadBodySystem
    triage_priority: VisitpadTriagePriority
    synonyms: list[str] = Field(default_factory=list, max_length=50)
    is_paediatric_relevant: bool = False
    display_order: int = 0
    is_active: bool = True
    snomed_code: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def _cap_synonym_strings(self) -> Self:
        for s in self.synonyms:
            if len(s) > 256:
                raise ValueError("Each synonym must be at most 256 characters.")
        return self


class VisitpadChiefComplaintUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    body_system: VisitpadBodySystem | None = None
    triage_priority: VisitpadTriagePriority | None = None
    synonyms: list[str] | None = Field(default=None, max_length=50)
    is_paediatric_relevant: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _cap_synonym_strings(self) -> Self:
        if self.synonyms is not None:
            for s in self.synonyms:
                if len(s) > 256:
                    raise ValueError("Each synonym must be at most 256 characters.")
        return self

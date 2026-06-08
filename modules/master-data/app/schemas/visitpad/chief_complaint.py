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
    genitourinary = "genitourinary"
    dermatological = "dermatological"
    ophthalmological = "ophthalmological"
    endocrine = "endocrine"
    ent = "ent"
    skin = "skin"
    psychiatric = "psychiatric"
    general = "general"
    other = "other"


class VisitpadTriagePriority(StrEnum):
    emergency = "emergency"
    urgent = "urgent"
    semi_urgent = "semi_urgent"
    non_urgent = "non_urgent"
    routine = "routine"


class VisitpadChiefComplaintEnumOption(BaseModel):
    value: str
    label: str


class VisitpadChiefComplaintDescriptor(BaseModel):
    """UI dropdown source — values match ``VisitpadChiefComplaintCreate`` enums (single source in code)."""

    body_systems: list[VisitpadChiefComplaintEnumOption]
    triage_priorities: list[VisitpadChiefComplaintEnumOption]


def build_visitpad_chief_complaint_descriptor() -> VisitpadChiefComplaintDescriptor:
    body_labels: dict[VisitpadBodySystem, str] = {
        VisitpadBodySystem.cardiovascular: "Cardiovascular",
        VisitpadBodySystem.respiratory: "Respiratory",
        VisitpadBodySystem.neurological: "Neurological",
        VisitpadBodySystem.gastrointestinal: "Gastrointestinal",
        VisitpadBodySystem.musculoskeletal: "Musculoskeletal",
        VisitpadBodySystem.genitourinary: "Genitourinary",
        VisitpadBodySystem.dermatological: "Dermatological",
        VisitpadBodySystem.ophthalmological: "Ophthalmological",
        VisitpadBodySystem.endocrine: "Endocrine",
        VisitpadBodySystem.ent: "ENT",
        VisitpadBodySystem.skin: "Skin",
        VisitpadBodySystem.psychiatric: "Psychiatric",
        VisitpadBodySystem.general: "General",
        VisitpadBodySystem.other: "Other",
    }
    triage_labels: dict[VisitpadTriagePriority, str] = {
        VisitpadTriagePriority.emergency: "Emergency",
        VisitpadTriagePriority.urgent: "Urgent",
        VisitpadTriagePriority.semi_urgent: "Semi-urgent",
        VisitpadTriagePriority.non_urgent: "Non-urgent",
        VisitpadTriagePriority.routine: "Routine",
    }
    return VisitpadChiefComplaintDescriptor(
        body_systems=[
            VisitpadChiefComplaintEnumOption(value=e.value, label=body_labels[e]) for e in VisitpadBodySystem
        ],
        triage_priorities=[
            VisitpadChiefComplaintEnumOption(value=e.value, label=triage_labels[e]) for e in VisitpadTriagePriority
        ],
    )


class VisitpadChiefComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    code: str
    display_name: str
    short_name: str | None = None
    body_system: VisitpadBodySystem
    triage_priority: VisitpadTriagePriority
    synonyms: list[str]
    is_paediatric_relevant: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    snomed_code: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadChiefComplaintListResponse(BaseModel):
    data: list[VisitpadChiefComplaintResponse]
    total: int


class VisitpadChiefComplaintSingleResponse(BaseModel):
    data: VisitpadChiefComplaintResponse


class VisitpadChiefComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=3, max_length=9, pattern=r"^[A-Za-z0-9_]{3,9}$")
    display_name: str = Field(min_length=1, max_length=256)
    short_name: str | None = Field(default=None, max_length=120)
    body_system: VisitpadBodySystem = VisitpadBodySystem.general
    triage_priority: VisitpadTriagePriority = VisitpadTriagePriority.routine
    synonyms: list[str] = Field(default_factory=list, max_length=50)
    is_paediatric_relevant: bool = False
    display_order: int = 0
    is_active: bool = True
    snomed_code: str | None = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def _short_name_and_synonyms(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        for s in self.synonyms:
            if len(s) > 256:
                raise ValueError("Each synonym must be at most 256 characters.")
        return self


class VisitpadChiefComplaintUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    short_name: str | None = Field(default=None, max_length=120)
    body_system: VisitpadBodySystem | None = None
    triage_priority: VisitpadTriagePriority | None = None
    synonyms: list[str] | None = Field(default=None, max_length=50)
    is_paediatric_relevant: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    snomed_code: str | None = Field(default=None, max_length=64)
    is_deleted: bool | None = None

    @model_validator(mode="after")
    def _cap_optional_strings(self) -> Self:
        if self.short_name is not None and len(self.short_name) > 120:
            raise ValueError("short_name must be at most 120 characters.")
        if self.synonyms is not None:
            for s in self.synonyms:
                if len(s) > 256:
                    raise ValueError("Each synonym must be at most 256 characters.")
        return self

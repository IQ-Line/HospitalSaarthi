"""Pydantic payloads for Visitpad Rx columns."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

VISITPAD_RX_COLUMN_CODE_PATTERN = r"^[A-Za-z0-9_]{2,64}$"


class VisitpadRxColumnSection(StrEnum):
    medication_type = "medication_type"
    frequency = "frequency"
    unit = "unit"
    diet_type = "diet_type"
    method_strength = "method_strength"
    route = "route"
    time_of_administration = "time_of_administration"


class VisitpadRxColumnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    section: VisitpadRxColumnSection
    display_name: str
    code: str
    extra_unit: str | None = None
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadRxColumnListResponse(BaseModel):
    data: list[VisitpadRxColumnResponse]
    total: int


class VisitpadRxColumnSingleResponse(BaseModel):
    data: VisitpadRxColumnResponse


class VisitpadRxColumnCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    section: VisitpadRxColumnSection
    display_name: str = Field(min_length=1, max_length=256)
    code: str = Field(min_length=2, max_length=64, pattern=VISITPAD_RX_COLUMN_CODE_PATTERN)
    extra_unit: str | None = Field(default=None, max_length=128)
    display_order: int = 0
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _strip_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class VisitpadRxColumnUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    extra_unit: str | None = Field(default=None, max_length=128)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = Field(
        default=None,
        description="Set false to restore a soft-deleted row.",
    )

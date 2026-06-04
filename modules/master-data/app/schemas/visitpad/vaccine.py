"""Pydantic payloads for Visitpad vaccines."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.visitpad._code import VISITPAD_CATALOG_CODE_PATTERN


class VisitpadVaccineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    code: str
    short_name: str | None = None
    display_name: str
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadVaccineListResponse(BaseModel):
    data: list[VisitpadVaccineResponse]
    total: int


class VisitpadVaccineSingleResponse(BaseModel):
    data: VisitpadVaccineResponse


class VisitpadVaccineCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=3, max_length=9, pattern=VISITPAD_CATALOG_CODE_PATTERN)
    display_name: str = Field(min_length=1, max_length=512)
    short_name: str | None = Field(default=None, max_length=120)
    display_order: int = 0
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def _strip_lower_code(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class VisitpadVaccineUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=512)
    short_name: str | None = Field(default=None, max_length=120)
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

"""Pydantic payloads for Visitpad units and unit conversions."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VisitpadUnitDimension(StrEnum):
    length = "length"
    mass = "mass"
    volume = "volume"
    time = "time"
    temperature = "temperature"
    pressure = "pressure"
    concentration = "concentration"
    ratio = "ratio"
    count = "count"
    other = "other"


class VisitpadUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: int | None = None
    code: str
    display_name: str
    dimension: VisitpadUnitDimension
    ucum_code: str | None = None
    is_canonical: bool
    display_order: int
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadUnitListResponse(BaseModel):
    data: list[VisitpadUnitResponse]
    total: int


class VisitpadUnitSingleResponse(BaseModel):
    data: VisitpadUnitResponse


class VisitpadUnitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(
        min_length=1,
        max_length=64,
        description="Trimmed and stored lowercase; uniqueness is case-insensitive among active rows.",
    )
    display_name: str = Field(min_length=1, max_length=256)
    dimension: VisitpadUnitDimension
    ucum_code: str | None = Field(default=None, max_length=64)
    is_canonical: bool = False
    display_order: int = 0
    is_active: bool = True


class VisitpadUnitUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=256)
    dimension: VisitpadUnitDimension | None = None
    ucum_code: str | None = Field(default=None, max_length=64)
    is_canonical: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None
    is_deleted: bool | None = Field(
        default=None,
        description="Set false to restore a soft-deleted row (superadmin).",
    )


class VisitpadUnitConversionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: int | None = None
    from_unit_code: str
    to_unit_code: str
    factor: float
    offset_value: float
    display_order: int
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class VisitpadUnitConversionListResponse(BaseModel):
    data: list[VisitpadUnitConversionResponse]
    total: int


class VisitpadUnitConversionSingleResponse(BaseModel):
    data: VisitpadUnitConversionResponse


class VisitpadUnitConversionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_unit_code: str = Field(min_length=1, max_length=64)
    to_unit_code: str = Field(min_length=1, max_length=64)
    factor: float
    offset_value: float = 0.0
    display_order: int = 0


class VisitpadUnitConversionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_unit_code: str | None = Field(default=None, min_length=1, max_length=64)
    to_unit_code: str | None = Field(default=None, min_length=1, max_length=64)
    factor: float | None = None
    offset_value: float | None = None
    display_order: int | None = None
    is_deleted: bool | None = Field(
        default=None,
        description="Set false to restore a soft-deleted conversion.",
    )

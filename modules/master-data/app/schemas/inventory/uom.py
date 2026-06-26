"""Pydantic payloads for inventory UOMs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryUomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    abbreviation: str
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryUomListResponse(BaseModel):
    data: list[InventoryUomResponse]
    total: int


class InventoryUomSingleResponse(BaseModel):
    data: InventoryUomResponse


class InventoryUomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    abbreviation: str = Field(min_length=1, max_length=32, pattern=r"^[a-zA-Z0-9µ/]+$")
    is_active: bool = True


class InventoryUomUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    abbreviation: str | None = Field(
        default=None,
        min_length=1,
        max_length=32,
        pattern=r"^[a-zA-Z0-9µ/]+$",
    )
    is_active: bool | None = None
    is_deleted: bool | None = None

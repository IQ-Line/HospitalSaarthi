"""Pydantic payloads for inventory item types."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryItemTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryItemTypeListResponse(BaseModel):
    data: list[InventoryItemTypeResponse]
    total: int


class InventoryItemTypeSingleResponse(BaseModel):
    data: InventoryItemTypeResponse


class InventoryItemTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200, pattern=r"^[a-zA-Z0-9 ]+$")
    is_active: bool = True


class InventoryItemTypeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200, pattern=r"^[a-zA-Z0-9 ]+$")
    is_active: bool | None = None
    is_deleted: bool | None = None

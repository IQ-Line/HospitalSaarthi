"""Pydantic payloads for inventory storage conditions."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryStorageConditionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    description: str
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryStorageConditionListResponse(BaseModel):
    data: list[InventoryStorageConditionResponse]
    total: int


class InventoryStorageConditionSingleResponse(BaseModel):
    data: InventoryStorageConditionResponse


class InventoryStorageConditionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    is_active: bool = True


class InventoryStorageConditionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    is_deleted: bool | None = None

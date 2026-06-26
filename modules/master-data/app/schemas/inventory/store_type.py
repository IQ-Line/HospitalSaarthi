"""Pydantic payloads for inventory store types."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryStoreTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    code: str
    name: str
    description: str
    can_receive_stock: bool
    can_dispense: bool
    can_issue_to_ward: bool
    track_batch_expiry: bool
    indent_authority: bool
    default_indent_target_store_id: UUID | None = None
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryStoreTypeListResponse(BaseModel):
    data: list[InventoryStoreTypeResponse]
    total: int


class InventoryStoreTypeSingleResponse(BaseModel):
    data: InventoryStoreTypeResponse


class InventoryStoreTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(default=None, min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    is_active: bool = True
    can_receive_stock: bool
    can_dispense: bool
    can_issue_to_ward: bool
    track_batch_expiry: bool
    indent_authority: bool
    default_indent_target_store_id: UUID | None = None


class InventoryStoreTypeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    can_receive_stock: bool | None = None
    can_dispense: bool | None = None
    can_issue_to_ward: bool | None = None
    track_batch_expiry: bool | None = None
    indent_authority: bool | None = None
    default_indent_target_store_id: UUID | None = None
    is_deleted: bool | None = None

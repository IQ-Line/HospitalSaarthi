"""Pydantic payloads for inventory categories."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    parent_category_id: UUID | None = None
    description: str | None = None
    is_active: bool
    is_deleted: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class InventoryCategoryListResponse(BaseModel):
    data: list[InventoryCategoryResponse]
    total: int


class InventoryCategorySingleResponse(BaseModel):
    data: InventoryCategoryResponse


class InventoryCategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    parent_category_id: UUID | None = None
    is_active: bool = True


class InventoryCategoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    parent_category_id: UUID | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

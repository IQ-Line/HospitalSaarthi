"""Pydantic models for picklist read HTTP payloads."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PicklistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    is_active: bool
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class PicklistListResponse(BaseModel):
    data: list[PicklistResponse]
    total: int


class PicklistValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    category_id: UUID
    value: str
    label: str
    description: str | None = None
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_")
    is_active: bool
    is_default: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class PicklistValueListResponse(BaseModel):
    data: list[PicklistValueResponse]
    total: int

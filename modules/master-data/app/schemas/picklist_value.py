"""Pydantic models for picklist value (item) CRUD HTTP payloads."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PicklistValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    category_id: UUID
    slug: str
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


class PicklistValueSingleResponse(BaseModel):
    data: PicklistValueResponse


class PicklistValueCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(min_length=1)
    value: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str | None = None
    metadata: dict[str, Any] | None = None
    is_active: bool = True
    is_default: bool = False
    display_order: int = 0


class PicklistValueUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(default=None, min_length=1)
    value: str | None = Field(default=None, min_length=1)
    label: str | None = Field(default=None, min_length=1)
    description: str | None = None
    metadata: dict[str, Any] | None = None
    is_active: bool | None = None
    is_default: bool | None = None
    display_order: int | None = None

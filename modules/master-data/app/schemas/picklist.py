"""Pydantic models for picklist domain (read-only) HTTP payloads."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PicklistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    slug: str
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class PicklistListResponse(BaseModel):
    data: list[PicklistResponse]
    total: int


class PicklistSingleResponse(BaseModel):
    data: PicklistResponse

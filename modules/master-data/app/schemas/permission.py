"""Pydantic models for permission CRUD HTTP payloads."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PermissionAction(StrEnum):
    create = "create"
    read = "read"
    update = "update"
    delete = "delete"
    manage = "manage"


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    slug: str
    action: PermissionAction
    description: str | None = None
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class PermissionListResponse(BaseModel):
    data: list[PermissionResponse]
    total: int


class PermissionSingleResponse(BaseModel):
    data: PermissionResponse


class PermissionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    action: PermissionAction
    description: str | None = None
    is_active: bool = True


class PermissionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    slug: str | None = Field(default=None, min_length=1)
    action: PermissionAction | None = None
    description: str | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

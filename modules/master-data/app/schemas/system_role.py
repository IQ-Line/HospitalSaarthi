"""Pydantic models for system role template CRUD HTTP payloads."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemRoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int | None = None
    name: str
    slug: str
    is_template: bool
    description: str | None = None
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class SystemRoleListResponse(BaseModel):
    data: list[SystemRoleResponse]
    total: int


class SystemRoleSingleResponse(BaseModel):
    data: SystemRoleResponse


class SystemRoleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    description: str | None = None
    is_template: bool = True
    is_active: bool = True


class SystemRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    slug: str | None = Field(default=None, min_length=1)
    description: str | None = None
    is_template: bool | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

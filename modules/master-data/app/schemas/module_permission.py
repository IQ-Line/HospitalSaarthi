"""Pydantic models for module_permissions junction CRUD."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModulePermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    module_id: UUID
    permission_id: UUID
    is_default: bool
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class ModulePermissionListResponse(BaseModel):
    data: list[ModulePermissionResponse]
    total: int


class ModulePermissionSingleResponse(BaseModel):
    data: ModulePermissionResponse


class ModulePermissionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(
        min_length=1,
        description=(
            "Stable key for this link (unique among active rows). "
            "Convention: combine module and permission slugs, e.g. `opd:opd:create`."
        ),
    )
    module_id: UUID
    permission_id: UUID
    is_default: bool = False
    is_active: bool = True


class ModulePermissionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(default=None, min_length=1)
    module_id: UUID | None = None
    permission_id: UUID | None = None
    is_default: bool | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

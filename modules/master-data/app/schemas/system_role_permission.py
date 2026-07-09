"""Pydantic models for system_role_permissions junction CRUD."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemRolePermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    slug: str
    system_role_id: UUID
    permission_id: UUID
    is_default: bool
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class SystemRolePermissionListResponse(BaseModel):
    data: list[SystemRolePermissionResponse]
    total: int


class SystemRolePermissionSingleResponse(BaseModel):
    data: SystemRolePermissionResponse


class SystemRolePermissionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(
        min_length=1,
        description=(
            "Stable key for this link (unique among active rows). "
            "Convention: combine role and permission slugs, e.g. `pharmacist:pharmacy:dispense`."
        ),
    )
    system_role_id: UUID
    permission_id: UUID
    is_default: bool = False
    is_active: bool = True


class SystemRolePermissionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(default=None, min_length=1)
    # Junction FK pair is immutable after creation. Re-pointing requires delete + create.
    is_default: bool | None = None
    is_active: bool | None = None
    is_deleted: bool | None = None

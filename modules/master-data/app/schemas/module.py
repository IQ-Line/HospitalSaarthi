"""Pydantic models for module HTTP payloads (OpenAPI ``Module``, list/single responses)."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModuleCategory(StrEnum):
    core = "core"
    clinical = "clinical"
    administrative = "administrative"
    support = "support"


class ModuleResponse(BaseModel):
    """Single module row returned by list/detail endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    parent_id: UUID | None = None
    name: str = Field(description="Stable machine key for APIs and events.")
    slug: str = Field(description="URL-safe unique key for routing.")
    description: str | None = None
    category: ModuleCategory
    version: str
    level: int = Field(
        ge=1,
        le=10,
        description="Nesting depth (parent → child → child …); computed by the API.",
    )
    icon: str | None = Field(default=None, description="Optional UI icon token.")
    is_active: bool = Field(description="False hides the module from default admin navigation.")
    is_deleted: bool = Field(
        default=False,
        description=(
            "Soft-delete flag; read APIs omit deleted rows. "
            "Present on the wire for consistency with ERD."
        ),
    )
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class ModuleListResponse(BaseModel):
    data: list[ModuleResponse]
    total: int


class ModuleSingleResponse(BaseModel):
    """One module wrapped for GET-by-id / GET-by-slug (matches OpenAPI / LLD item shape)."""

    data: ModuleResponse


class ModuleCreate(BaseModel):
    """Create body for the module registry."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, description="URL-safe unique key among active rows.")
    category: ModuleCategory
    version: str = Field(default="0.0.0")
    description: str | None = None
    parent_id: UUID | None = None
    icon: str | None = None
    is_active: bool = True


class ModuleUpdate(BaseModel):
    """PATCH — optional fields; ``level`` not accepted (computed from ``parent_id``)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, min_length=1)
    category: ModuleCategory | None = None
    version: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    icon: str | None = None
    is_active: bool | None = None
    is_deleted: bool | None = Field(
        default=None,
        description="Set false to restore a soft-deleted row (superadmin).",
    )

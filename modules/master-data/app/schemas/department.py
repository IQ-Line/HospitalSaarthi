"""Pydantic models for department catalog HTTP payloads."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DepartmentType(StrEnum):
    clinical = "clinical"
    diagnostic = "diagnostic"
    administrative = "administrative"
    support = "support"


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    iq_tenant_id: UUID | None = None
    name: str
    code: str
    type: DepartmentType
    description: str | None = None
    is_active: bool
    is_deleted: bool = False
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class DepartmentListResponse(BaseModel):
    data: list[DepartmentResponse]
    total: int


class DepartmentSingleResponse(BaseModel):
    data: DepartmentResponse


class DepartmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=64, description="Unique among active rows in this catalog scope.")
    type: DepartmentType
    description: str | None = None
    is_active: bool = True

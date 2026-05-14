"""Shared request/response for Visitpad bulk import from the platform (public) catalog."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VisitpadPlatformImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform_row_ids: list[UUID] = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Platform (public schema) row UUIDs to copy into the tenant catalog.",
    )


class VisitpadPlatformImportErrorItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform_row_id: UUID
    message: str


class VisitpadPlatformImportData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    created: list[UUID] = Field(
        default_factory=list,
        description="IDs of newly created tenant rows.",
    )
    skipped: list[UUID] = Field(
        default_factory=list,
        description="Platform row IDs skipped because an equivalent tenant row already exists.",
    )
    errors: list[VisitpadPlatformImportErrorItem] = Field(default_factory=list)


class VisitpadPlatformImportSingleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: VisitpadPlatformImportData


class VisitpadCatalogKeysResponse(BaseModel):
    """All canonical import keys for the tenant catalog (single round trip for import UI)."""

    model_config = ConfigDict(extra="forbid")

    data: list[str]

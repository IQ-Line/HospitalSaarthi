from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class OpdVisitSummary(BaseModel):
    visit_id: UUID
    patient_id: UUID
    status: str
    updated_at: datetime


class OpdVisitListResponse(BaseModel):
    items: list[OpdVisitSummary]


class OpdPatientEncounterSummary(BaseModel):
    """Latest OPD encounter per patient for the active tenant (patients queue)."""

    patient_id: UUID
    visit_id: UUID
    visit_status: str
    prescription_status: str | None = None
    updated_at: datetime
    created_at: datetime


class OpdPatientListResponse(BaseModel):
    items: list[OpdPatientEncounterSummary]
    total: int
    page: int
    limit: int


class OpdEnsureEncounterRequest(BaseModel):
    """Link a registration.visit row to OPD visit + draft prescription (same visit_id)."""

    patient_id: UUID
    doctor_id: UUID | None = None


class OpdPrescriptionUpsertRequest(BaseModel):
    form_data: dict[str, Any] = Field(default_factory=dict)
    finalize: bool = False


class OpdPrescriptionResponse(BaseModel):
    prescription_id: UUID
    visit_id: UUID
    patient_id: UUID
    visit_status: str
    prescription_status: str
    is_read_only: bool
    doctor_id: UUID | None = None
    finalized_at: datetime | None = None
    form_data: dict[str, Any]


class HealthDocumentSummary(BaseModel):
    id: UUID
    patient_id: UUID
    visit_id: UUID | None = None
    file_name: str
    file_type: str
    document_title: str
    hi_type: str
    uploaded_at: datetime
    download_url: str


class HealthDocumentUploadResponse(BaseModel):
    id: UUID
    patient_id: UUID
    visit_id: UUID | None = None
    file_name: str
    file_type: str
    document_title: str
    hi_type: str
    uploaded_at: datetime


class HealthDocumentListResponse(BaseModel):
    success: bool
    count: int
    total: int
    total_pages: int
    current_page: int
    limit: int
    data: list[HealthDocumentSummary]


class HealthDocumentDownloadResponse(BaseModel):
    """Time-limited Azure Blob SAS URL (SPA clients; use Accept: application/json)."""

    url: str

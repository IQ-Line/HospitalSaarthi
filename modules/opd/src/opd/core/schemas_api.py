from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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

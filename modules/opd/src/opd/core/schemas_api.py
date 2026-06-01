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


class OpdPrescriptionUpsertRequest(BaseModel):
    form_data: dict[str, Any] = Field(default_factory=dict)


class OpdPrescriptionResponse(BaseModel):
    prescription_id: UUID
    visit_id: UUID
    patient_id: UUID
    visit_status: str
    prescription_status: str
    is_read_only: bool
    form_data: dict[str, Any]

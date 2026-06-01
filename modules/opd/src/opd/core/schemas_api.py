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


class OpdPrescriptionUpsertRequest(BaseModel):
    form_data: dict[str, Any] = Field(default_factory=dict)


class OpdPrescriptionResponse(BaseModel):
    visit_id: UUID
    patient_id: UUID
    visit_status: str
    prescription_status: str
    is_read_only: bool
    form_data: dict[str, Any]

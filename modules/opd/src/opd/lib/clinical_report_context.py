from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ClinicalReportContext:
    """Desk / facility context for clinical PDF generation (query params)."""

    facility_name: str | None = None
    facility_id: str | None = None
    facility_address: str | None = None
    facility_phone: str | None = None
    facility_email: str | None = None
    department_name: str | None = None
    doctor_name: str | None = None
    patient_address: str | None = None
    request_id: str | None = None

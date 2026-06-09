"""Notify pharmacy OPD queue projection after consultation lifecycle changes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from opd.data_access.registration_patient_snapshot import load_pharmacy_queue_patient_fields
from opd.data_access.registration_visit_display import load_formatted_visit_id
from opd.lib.http_pharmacy_gateway import get_pharmacy_gateway
from opd.models.prescription_row import Prescription
from opd.models.visit import Visit


def _medicine_count_from_form_data(form_data: dict[str, Any] | None) -> int:
    if not isinstance(form_data, dict):
        return 0
    medicines = form_data.get("medicines")
    if not isinstance(medicines, list):
        return 0
    return len(medicines)


def _merge_patient_fields(
    payload: dict[str, Any],
    session: Session | None,
    tenant_id: UUID,
    patient_id: UUID,
) -> None:
    if session is None:
        return
    patient_fields = load_pharmacy_queue_patient_fields(session, tenant_id, patient_id)
    if patient_fields is None:
        return
    payload.update(patient_fields)


def _merge_visit_fields(
    payload: dict[str, Any],
    session: Session | None,
    tenant_id: UUID,
    visit_id: UUID,
) -> None:
    if session is None:
        return
    formatted_visit_id = load_formatted_visit_id(session, tenant_id, visit_id)
    if formatted_visit_id is not None:
        payload["formatted_visit_id"] = formatted_visit_id


def _upsert_projection(
    tenant_id: UUID,
    visit_id: UUID,
    *,
    session: Session | None,
    patient_id: UUID,
    prescription_id: UUID,
    doctor_id: UUID | None,
    visit_status: str,
    prescription_status: str,
    medicine_count: int,
    updated_at: datetime,
    finalized_at: datetime | None,
) -> None:
    payload: dict[str, Any] = {
        "patient_id": str(patient_id),
        "prescription_id": str(prescription_id),
        "doctor_id": str(doctor_id) if doctor_id is not None else None,
        "visit_status": visit_status,
        "prescription_status": prescription_status,
        "medicine_count": medicine_count,
        "updated_at": updated_at.isoformat(),
        "finalized_at": finalized_at.isoformat() if finalized_at is not None else None,
    }
    _merge_patient_fields(payload, session, tenant_id, patient_id)
    _merge_visit_fields(payload, session, tenant_id, visit_id)
    get_pharmacy_gateway().upsert_queue_projection(tenant_id, visit_id, payload)


def notify_pharmacy_queue_projection(
    tenant_id: UUID,
    visit: Visit,
    rx: Prescription,
    *,
    session: Session | None = None,
) -> None:
    finalized_at = rx.finalized_at
    updated_at = rx.updated_at if rx.updated_at is not None else datetime.now(UTC)
    _upsert_projection(
        tenant_id,
        visit.id,
        session=session,
        patient_id=visit.patient_id,
        prescription_id=rx.id,
        doctor_id=rx.doctor_id,
        visit_status=visit.status,
        prescription_status=rx.status,
        medicine_count=_medicine_count_from_form_data(rx.form_data),
        updated_at=updated_at,
        finalized_at=finalized_at,
    )


def notify_pharmacy_queue_after_prescription_finalize(
    session: Session,
    tenant_id: UUID,
    prescription_id: UUID,
) -> None:
    """Push queue projection for REST ``POST /prescriptions/{id}/finalize`` (normalized aggregate)."""
    from opd.data_access.prescription_repository import (
        PrescriptionNotFoundError,
        PrescriptionRepository,
    )
    from opd.models.prescription.enums import PrescriptionStatus

    repo = PrescriptionRepository(session)
    try:
        rx = repo.get_by_id(tenant_id, prescription_id)
    except PrescriptionNotFoundError:
        return

    if rx.status != PrescriptionStatus.FINAL:
        return

    medicine_count = len(rx.medicines or [])
    finalized_at = rx.finalized_at
    updated_at = rx.updated_at if rx.updated_at is not None else datetime.now(UTC)

    _upsert_projection(
        tenant_id,
        rx.visit_id,
        session=session,
        patient_id=rx.patient_id,
        prescription_id=rx.id,
        doctor_id=rx.doctor_id,
        visit_status="completed",
        prescription_status="final",
        medicine_count=medicine_count,
        updated_at=updated_at,
        finalized_at=finalized_at,
    )

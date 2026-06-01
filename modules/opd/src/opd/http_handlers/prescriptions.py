from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from opd.core.deps import DbSession, TenantId
from opd.core.schemas_api import (
    OpdPrescriptionResponse,
    OpdPrescriptionUpsertRequest,
    OpdVisitListResponse,
    OpdVisitSummary,
)
from opd.data_access.prescription_repo import PrescriptionRepository

router = APIRouter(tags=["OpdPrescriptions"])


def _to_response(visit, rx) -> OpdPrescriptionResponse:
    return OpdPrescriptionResponse(
        visit_id=visit.id,
        patient_id=visit.patient_id,
        visit_status=visit.status,
        prescription_status=rx.status,
        is_read_only=visit.status == "completed" or rx.status == "final",
        form_data=rx.form_data or {},
    )


@router.get("/visits", response_model=OpdVisitListResponse)
def list_visits(
    db: DbSession,
    tenant_id: TenantId,
    patient_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> OpdVisitListResponse:
    repo = PrescriptionRepository(db, tenant_id)
    visits = repo.list_visits(patient_id=patient_id, status=status, limit=limit)
    return OpdVisitListResponse(
        items=[
            OpdVisitSummary(
                visit_id=v.id,
                patient_id=v.patient_id,
                status=v.status,
                updated_at=v.updated_at,
            )
            for v in visits
        ]
    )


@router.get("/patients/{patient_id}/prescription", response_model=OpdPrescriptionResponse)
def get_patient_prescription(
    patient_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id)
    row = repo.get_latest_visit_with_prescription(patient_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No OPD visit found for patient")
    visit, rx = row
    db.commit()
    return _to_response(visit, rx)


@router.put("/patients/{patient_id}/prescription", response_model=OpdPrescriptionResponse)
def upsert_patient_prescription(
    patient_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    db: DbSession,
    tenant_id: TenantId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id)
    visit, rx = repo.save_draft(patient_id, body.form_data)
    db.commit()
    return _to_response(visit, rx)


@router.post("/patients/{patient_id}/prescription/end", response_model=OpdPrescriptionResponse)
def end_patient_consultation(
    patient_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    db: DbSession,
    tenant_id: TenantId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id)
    visit, rx = repo.end_consultation(patient_id, body.form_data)
    db.commit()
    return _to_response(visit, rx)

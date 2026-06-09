from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query

from opd.core.deps import DbSession, TenantId
from opd.core.principal import resolve_doctor_id
from opd.core.schemas_api import (
    OpdCompletedVisitListResponse,
    OpdCompletedVisitSummary,
    OpdEnsureEncounterRequest,
    OpdPatientEncounterSummary,
    OpdPatientListResponse,
    OpdPrescriptionResponse,
    OpdPrescriptionUpsertRequest,
    OpdVisitListResponse,
    OpdVisitSummary,
)
from opd.data_access import prescription_bundle as bundle_api
from opd.data_access.prescription_bundle import PrescriptionBundle
from opd.data_access.prescription_form_data import effective_form_data
from opd.data_access.prescription_repo import PrescriptionRepository
from opd.data_access.registration_visit_repo import RegistrationVisitRepository
from opd.integrations.abdm_m2 import trigger_m2_after_end_consultation
from opd.lib.pharmacy_queue_notify import notify_pharmacy_queue_projection
from opd.models.prescription_row import Prescription
from opd.models.registration_visit import RegistrationVisit
from opd.models.visit import Visit

router = APIRouter(tags=["OpdPrescriptions"])

DoctorId = Annotated[UUID, Depends(resolve_doctor_id)]


def _visit_for_tenant(db: DbSession, tenant_id: TenantId, visit_id: UUID) -> Visit:
    visit = db.get(Visit, visit_id)
    if visit is None or visit.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="No OPD visit found")
    return visit


def _visit_for_tenant_or_ensure_registration(
    db: DbSession,
    tenant_id: TenantId,
    visit_id: UUID,
) -> Visit:
    """Resolve OPD visit row; create from registration.visit when desk flow skipped ensure."""
    visit = db.get(Visit, visit_id)
    if visit is not None:
        if visit.tenant_id != tenant_id:
            raise HTTPException(status_code=404, detail="No OPD visit found")
        return visit

    reg = db.get(RegistrationVisit, (tenant_id, visit_id))
    if reg is None:
        raise HTTPException(status_code=404, detail="No OPD visit found")

    repo = PrescriptionRepository(db, tenant_id, reg.doctor_id)
    try:
        visit, _ = repo.ensure_registration_encounter(
            visit_id,
            reg.patient_id,
            doctor_id=reg.doctor_id,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return visit


def _to_response(db: DbSession, bundle: PrescriptionBundle) -> OpdPrescriptionResponse:
    rx = bundle.rx
    return OpdPrescriptionResponse(
        prescription_id=rx.id,
        visit_id=bundle.visit_id,
        patient_id=bundle.patient_id,
        visit_status=bundle.visit_status,
        prescription_status=rx.status,
        is_read_only=bundle.is_read_only,
        doctor_id=rx.doctor_id,
        finalized_at=rx.finalized_at,
        form_data=effective_form_data(db, rx),
    )


def _notify_pharmacy_queue_if_final(
    db: DbSession,
    tenant_id: TenantId,
    visit: Visit,
    rx: Prescription,
) -> None:
    if rx.status != "final":
        return
    notify_pharmacy_queue_projection(tenant_id, visit, rx, session=db)


@router.get("/patients", response_model=OpdPatientListResponse)
def list_patients(
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
) -> OpdPatientListResponse:
    repo = RegistrationVisitRepository(db, tenant_id)
    rows, total = repo.list_patient_encounters(status=status, page=page, limit=limit)
    return OpdPatientListResponse(
        items=[
            OpdPatientEncounterSummary(
                patient_id=r.patient_id,
                visit_id=r.visit_id,
                visit_status=r.visit_status,
                prescription_status=r.prescription_status,
                updated_at=r.updated_at,
                created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.put("/visits/{visit_id}/encounter", response_model=OpdPrescriptionResponse)
def ensure_registration_encounter(
    visit_id: UUID,
    body: OpdEnsureEncounterRequest,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    """Create OPD visit + draft prescription for a registration.visit id (idempotent)."""
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    try:
        _visit, rx = repo.ensure_registration_encounter(
            visit_id,
            body.patient_id,
            doctor_id=body.doctor_id,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    return _to_response(
        db,
        bundle_api.bundle_from_prescription(db, tenant_id, rx),
    )


@router.get("/visits/completed", response_model=OpdCompletedVisitListResponse)
def list_completed_visits(
    db: DbSession,
    tenant_id: TenantId,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    queued_from: date | None = Query(default=None),
    queued_to: date | None = Query(default=None),
) -> OpdCompletedVisitListResponse:
    repo = PrescriptionRepository(db, tenant_id)
    rows, total = repo.list_completed_visits(
        page=page,
        limit=limit,
        queued_from=queued_from,
        queued_to=queued_to,
    )
    return OpdCompletedVisitListResponse(
        items=[
            OpdCompletedVisitSummary(
                visit_id=row.visit_id,
                patient_id=row.patient_id,
                prescription_id=row.prescription_id,
                doctor_id=row.doctor_id,
                visit_status=row.visit_status,
                prescription_status=row.prescription_status,
                updated_at=row.updated_at,
                finalized_at=row.finalized_at,
                medicine_count=row.medicine_count,
            )
            for row in rows
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/visits", response_model=OpdVisitListResponse)
def list_visits(
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
    patient_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> OpdVisitListResponse:
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
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


@router.get("/visits/{visit_id}/prescription", response_model=OpdPrescriptionResponse)
def get_visit_prescription(
    visit_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    bundle = repo.get_visit_with_prescription(visit_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="No OPD prescription found for visit")
    db.commit()
    return _to_response(db, bundle)


@router.get("/patients/{patient_id}/prescription", response_model=OpdPrescriptionResponse)
def get_patient_prescription(
    patient_id: UUID,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    bundle = repo.get_latest_prescription(patient_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="No OPD prescription found for patient")
    db.commit()
    return _to_response(db, bundle)


@router.put("/visits/{visit_id}/prescription/pre-consult", response_model=OpdPrescriptionResponse)
def upsert_visit_nurse_pre_consult(
    visit_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    visit = _visit_for_tenant_or_ensure_registration(db, tenant_id, visit_id)
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    try:
        visit, rx = repo.save_nurse_pre_consult_for_visit(
            visit_id,
            visit.patient_id,
            body.form_data,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    return _to_response(db, bundle_api.bundle_from_prescription(db, tenant_id, rx))


@router.put("/visits/{visit_id}/prescription", response_model=OpdPrescriptionResponse)
def upsert_visit_prescription(
    visit_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    visit = _visit_for_tenant_or_ensure_registration(db, tenant_id, visit_id)
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    try:
        if body.finalize:
            visit, rx = repo.finalize_prescription_for_visit(
                visit_id,
                visit.patient_id,
                body.form_data,
            )
        else:
            visit, rx = repo.save_draft_for_visit(visit_id, visit.patient_id, body.form_data)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    _notify_pharmacy_queue_if_final(db, tenant_id, visit, rx)
    return _to_response(db, bundle_api.bundle_from_prescription(db, tenant_id, rx))


@router.post("/visits/{visit_id}/prescription/end", response_model=OpdPrescriptionResponse)
def end_visit_consultation(
    visit_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    visit = _visit_for_tenant_or_ensure_registration(db, tenant_id, visit_id)
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    try:
        visit, rx = repo.end_consultation_for_visit(visit_id, visit.patient_id, body.form_data)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    _notify_pharmacy_queue_if_final(db, tenant_id, visit, rx)
    background_tasks.add_task(
        trigger_m2_after_end_consultation,
        tenant_id=tenant_id,
        patient_id=visit.patient_id,
        visit_id=visit.id,
    )
    return _to_response(db, bundle_api.bundle_from_prescription(db, tenant_id, rx))


@router.put("/patients/{patient_id}/prescription", response_model=OpdPrescriptionResponse)
def upsert_patient_prescription(
    patient_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    try:
        if body.finalize:
            visit, rx = repo.end_consultation(patient_id, body.form_data)
        else:
            visit, rx = repo.save_draft(patient_id, body.form_data)
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    _notify_pharmacy_queue_if_final(db, tenant_id, visit, rx)
    return _to_response(db, bundle_api.bundle_from_prescription(db, tenant_id, rx))


@router.post("/patients/{patient_id}/prescription/end", response_model=OpdPrescriptionResponse)
def end_patient_consultation(
    patient_id: UUID,
    body: OpdPrescriptionUpsertRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    tenant_id: TenantId,
    doctor_id: DoctorId,
) -> OpdPrescriptionResponse:
    repo = PrescriptionRepository(db, tenant_id, doctor_id)
    visit, rx = repo.end_consultation(patient_id, body.form_data)
    db.commit()
    _notify_pharmacy_queue_if_final(db, tenant_id, visit, rx)
    background_tasks.add_task(
        trigger_m2_after_end_consultation,
        tenant_id=tenant_id,
        patient_id=visit.patient_id,
        visit_id=visit.id,
    )
    return _to_response(db, bundle_api.bundle_from_prescription(db, tenant_id, rx))

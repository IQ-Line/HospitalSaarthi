"""HTTP routes for prescriptions (`/prescriptions`)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from opd.integrations.abdm_m2 import trigger_m2_after_end_consultation

from opd.data_access.prescription_repository import (
    PrescriptionConflictError,
    PrescriptionNotFoundError,
)
from opd.http_handlers.deps import get_prescription_service, get_session
from opd.schemas.prescription import (
    PrescriptionCancelRequest,
    PrescriptionCreate,
    PrescriptionEncounterOverlayBatchResponse,
    PrescriptionFinalizeRequest,
    PrescriptionListResponse,
    PrescriptionSingleResponse,
    PrescriptionUpdate,
)
from opd.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

_MAX_BATCH_VISIT_IDS = 100


def _parse_visit_ids_param(raw: str | None) -> list[UUID]:
    if not raw or not raw.strip():
        return []
    parsed: list[UUID] = []
    for part in raw.replace(" ", "").split(","):
        if part:
            parsed.append(UUID(part))
    return list(dict.fromkeys(parsed))


def _not_found(exc: PrescriptionNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _conflict(exc: PrescriptionConflictError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("", response_model=PrescriptionListResponse, summary="List prescriptions for a patient")
def list_prescriptions(
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    patient_id: Annotated[UUID, Query(description="Patient identifier")],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PrescriptionListResponse:
    rows, total = service.list_by_patient(tenant_id, patient_id, limit=limit, offset=offset)
    return PrescriptionListResponse(data=rows, total=total)


@router.post(
    "",
    response_model=PrescriptionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a draft prescription for a registration visit_id",
)
def create_prescription(
    payload: PrescriptionCreate,
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    session: Annotated[Session, Depends(get_session)],
) -> PrescriptionSingleResponse:
    try:
        data = service.create(payload)
    except PrescriptionConflictError as exc:
        raise _conflict(exc) from exc
    session.commit()
    return PrescriptionSingleResponse(data=data)


@router.get(
    "/by-visit/{visit_id}",
    response_model=PrescriptionSingleResponse,
    summary="Get prescription by registration visit_id (1:1)",
)
def get_prescription_by_visit(
    visit_id: UUID,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
) -> PrescriptionSingleResponse:
    try:
        data = service.get_by_visit_id(tenant_id, visit_id)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    return PrescriptionSingleResponse(data=data)


@router.get(
    "/by-visits",
    response_model=PrescriptionEncounterOverlayBatchResponse,
    summary="Batch prescription + visit queue status by registration visit_ids",
)
def get_prescription_overlays_by_visits(
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    visit_ids: Annotated[
        str | None,
        Query(description="Comma-separated registration visit identifiers"),
    ] = None,
) -> PrescriptionEncounterOverlayBatchResponse:
    unique_visit_ids = _parse_visit_ids_param(visit_ids)
    if not unique_visit_ids:
        return PrescriptionEncounterOverlayBatchResponse(data={})
    if len(unique_visit_ids) > _MAX_BATCH_VISIT_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"At most {_MAX_BATCH_VISIT_IDS} visit_ids per request",
        )
    data = service.get_overlays_by_visit_ids(tenant_id, unique_visit_ids)
    return PrescriptionEncounterOverlayBatchResponse(data=data)


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionSingleResponse,
    summary="Get prescription by id",
)
def get_prescription(
    prescription_id: UUID,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
) -> PrescriptionSingleResponse:
    try:
        data = service.get_by_id(tenant_id, prescription_id)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    return PrescriptionSingleResponse(data=data)


@router.put(
    "/{prescription_id}",
    response_model=PrescriptionSingleResponse,
    summary="Replace draft prescription clinical content",
)
def update_prescription(
    prescription_id: UUID,
    payload: PrescriptionUpdate,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    session: Annotated[Session, Depends(get_session)],
) -> PrescriptionSingleResponse:
    try:
        data = service.update(tenant_id, prescription_id, payload)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    except PrescriptionConflictError as exc:
        raise _conflict(exc) from exc
    session.commit()
    return PrescriptionSingleResponse(data=data)


@router.post(
    "/{prescription_id}/finalize",
    response_model=PrescriptionSingleResponse,
    summary="Finalize a draft prescription",
)
def finalize_prescription(
    prescription_id: UUID,
    payload: PrescriptionFinalizeRequest,
    background_tasks: BackgroundTasks,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    session: Annotated[Session, Depends(get_session)],
) -> PrescriptionSingleResponse:
    try:
        data = service.finalize(tenant_id, prescription_id, payload)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    except PrescriptionConflictError as exc:
        raise _conflict(exc) from exc
    session.commit()
    background_tasks.add_task(
        trigger_m2_after_end_consultation,
        tenant_id=tenant_id,
        patient_id=data.patient_id,
        visit_id=data.visit_id,
    )
    return PrescriptionSingleResponse(data=data)


@router.post(
    "/{prescription_id}/cancel",
    response_model=PrescriptionSingleResponse,
    summary="Cancel a draft prescription",
)
def cancel_prescription(
    prescription_id: UUID,
    payload: PrescriptionCancelRequest,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    session: Annotated[Session, Depends(get_session)],
) -> PrescriptionSingleResponse:
    try:
        data = service.cancel(tenant_id, prescription_id, payload)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    except PrescriptionConflictError as exc:
        raise _conflict(exc) from exc
    session.commit()
    return PrescriptionSingleResponse(data=data)


@router.delete(
    "/{prescription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a prescription",
)
def delete_prescription(
    prescription_id: UUID,
    tenant_id: Annotated[UUID, Query(description="Tenant isolation key")],
    service: Annotated[PrescriptionService, Depends(get_prescription_service)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    try:
        service.soft_delete(tenant_id, prescription_id)
    except PrescriptionNotFoundError as exc:
        raise _not_found(exc) from exc
    session.commit()

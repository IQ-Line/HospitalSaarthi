"""HTTP routes for Visitpad — chief complaints (`/visitpad/chief-complaints`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_chief_complaint_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_chief_complaint_repository import VisitpadChiefComplaintRepository
from app.schemas.visitpad_chief_complaint import (
    VisitpadBodySystem,
    VisitpadChiefComplaintCreate,
    VisitpadChiefComplaintDescriptor,
    VisitpadChiefComplaintListResponse,
    VisitpadChiefComplaintResponse,
    VisitpadChiefComplaintSingleResponse,
    VisitpadChiefComplaintUpdate,
    VisitpadTriagePriority,
    build_visitpad_chief_complaint_descriptor,
)
from app.services.visitpad_chief_complaints_service import (
    create_visitpad_chief_complaint,
    get_visitpad_chief_complaint_by_id,
    list_visitpad_chief_complaints,
    soft_delete_visitpad_chief_complaint,
    update_visitpad_chief_complaint,
)

router = APIRouter(prefix="/visitpad/chief-complaints", tags=["Visitpad — Chief complaints"])


@router.get("", response_model=VisitpadChiefComplaintListResponse, summary="List chief complaints")
def get_chief_complaints(
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    body_system: Annotated[VisitpadBodySystem | None, Query()] = None,
    triage_priority: Annotated[VisitpadTriagePriority | None, Query()] = None,
) -> VisitpadChiefComplaintListResponse:
    rows, total = list_visitpad_chief_complaints(
        repository,
        search=search,
        body_system=body_system.value if body_system is not None else None,
        triage_priority=triage_priority.value if triage_priority is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadChiefComplaintListResponse(
        data=[VisitpadChiefComplaintResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.get(
    "/descriptor",
    response_model=VisitpadChiefComplaintDescriptor,
    summary="Chief complaint form descriptor",
)
def get_chief_complaint_descriptor() -> VisitpadChiefComplaintDescriptor:
    """Dropdown values and labels — derived from the same enums as create/update (no duplicate client constants)."""
    return build_visitpad_chief_complaint_descriptor()


@router.post(
    "",
    response_model=VisitpadChiefComplaintSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create chief complaint",
)
def post_chief_complaint(
    payload: VisitpadChiefComplaintCreate,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = create_visitpad_chief_complaint(repository, payload=payload)
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.get(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Get chief complaint",
)
def get_chief_complaint(
    chief_complaint_id: UUID,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
) -> VisitpadChiefComplaintSingleResponse:
    row = get_visitpad_chief_complaint_by_id(repository, row_id=chief_complaint_id)
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.patch(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Update chief complaint",
)
def patch_chief_complaint(
    chief_complaint_id: UUID,
    payload: VisitpadChiefComplaintUpdate,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = update_visitpad_chief_complaint(
        repository,
        row_id=chief_complaint_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.delete(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Soft-delete chief complaint",
)
def delete_chief_complaint(
    chief_complaint_id: UUID,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = soft_delete_visitpad_chief_complaint(repository, row_id=chief_complaint_id)
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )

"""HTTP routes for Visitpad — diagnoses (`/visitpad/diagnoses`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_diagnosis_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_diagnosis_repository import VisitpadDiagnosisRepository
from app.schemas.visitpad_diagnosis import (
    VisitpadDiagnosisCategory,
    VisitpadDiagnosisCreate,
    VisitpadDiagnosisListResponse,
    VisitpadDiagnosisResponse,
    VisitpadDiagnosisSingleResponse,
    VisitpadDiagnosisUpdate,
)
from app.services.visitpad_diagnoses_service import (
    create_visitpad_diagnosis,
    get_visitpad_diagnosis_by_id,
    list_visitpad_diagnoses,
    soft_delete_visitpad_diagnosis,
    update_visitpad_diagnosis,
)

router = APIRouter(prefix="/visitpad/diagnoses", tags=["Visitpad — Diagnoses"])


@router.get("", response_model=VisitpadDiagnosisListResponse, summary="List diagnoses")
def get_diagnoses(
    repository: Annotated[VisitpadDiagnosisRepository, Depends(get_visitpad_diagnosis_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadDiagnosisCategory | None, Query()] = None,
) -> VisitpadDiagnosisListResponse:
    rows, total = list_visitpad_diagnoses(
        repository,
        search=search,
        category=category.value if category is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadDiagnosisListResponse(
        data=[VisitpadDiagnosisResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadDiagnosisSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create diagnosis",
)
def post_diagnosis(
    payload: VisitpadDiagnosisCreate,
    repository: Annotated[VisitpadDiagnosisRepository, Depends(get_visitpad_diagnosis_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadDiagnosisSingleResponse:
    row = create_visitpad_diagnosis(repository, payload=payload)
    session.commit()
    return VisitpadDiagnosisSingleResponse(data=VisitpadDiagnosisResponse.model_validate(row))


@router.get("/{diagnosis_id}", response_model=VisitpadDiagnosisSingleResponse, summary="Get diagnosis")
def get_diagnosis(
    diagnosis_id: UUID,
    repository: Annotated[VisitpadDiagnosisRepository, Depends(get_visitpad_diagnosis_repository)],
) -> VisitpadDiagnosisSingleResponse:
    row = get_visitpad_diagnosis_by_id(repository, row_id=diagnosis_id)
    if row is None:
        raise ResourceNotFoundError("No diagnosis with this id.")
    return VisitpadDiagnosisSingleResponse(data=VisitpadDiagnosisResponse.model_validate(row))


@router.patch("/{diagnosis_id}", response_model=VisitpadDiagnosisSingleResponse, summary="Update diagnosis")
def patch_diagnosis(
    diagnosis_id: UUID,
    payload: VisitpadDiagnosisUpdate,
    repository: Annotated[VisitpadDiagnosisRepository, Depends(get_visitpad_diagnosis_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadDiagnosisSingleResponse:
    row = update_visitpad_diagnosis(
        repository,
        row_id=diagnosis_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No diagnosis with this id.")
    session.commit()
    return VisitpadDiagnosisSingleResponse(data=VisitpadDiagnosisResponse.model_validate(row))


@router.delete("/{diagnosis_id}", response_model=VisitpadDiagnosisSingleResponse, summary="Soft-delete diagnosis")
def delete_diagnosis(
    diagnosis_id: UUID,
    repository: Annotated[VisitpadDiagnosisRepository, Depends(get_visitpad_diagnosis_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadDiagnosisSingleResponse:
    row = soft_delete_visitpad_diagnosis(repository, row_id=diagnosis_id)
    if row is None:
        raise ResourceNotFoundError("No diagnosis with this id.")
    session.commit()
    return VisitpadDiagnosisSingleResponse(data=VisitpadDiagnosisResponse.model_validate(row))

"""HTTP routes for Visitpad — vaccines (`/visitpad/vaccines`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_vaccine_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad.vaccine import VisitpadVaccineRepository
from app.schemas.visitpad.vaccine import (
    VisitpadVaccineCreate,
    VisitpadVaccineListResponse,
    VisitpadVaccineResponse,
    VisitpadVaccineSingleResponse,
    VisitpadVaccineUpdate,
)
from app.services.visitpad.vaccines import (
    create_visitpad_vaccine,
    get_visitpad_vaccine_by_id,
    list_visitpad_vaccines,
    soft_delete_visitpad_vaccine,
    update_visitpad_vaccine,
)

router = APIRouter(prefix="/visitpad/vaccines", tags=["Visitpad — Vaccines"])


@router.get("", response_model=VisitpadVaccineListResponse, summary="List vaccines")
def get_vaccines(
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
) -> VisitpadVaccineListResponse:
    rows, total = list_visitpad_vaccines(repository, search=search, limit=limit, offset=offset)
    return VisitpadVaccineListResponse(
        data=[VisitpadVaccineResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadVaccineSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create vaccine",
)
def post_vaccine(
    payload: VisitpadVaccineCreate,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVaccineSingleResponse:
    row = create_visitpad_vaccine(repository, payload=payload)
    session.commit()
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))


@router.get("/{vaccine_id}", response_model=VisitpadVaccineSingleResponse, summary="Get vaccine")
def get_vaccine(
    vaccine_id: UUID,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
) -> VisitpadVaccineSingleResponse:
    row = get_visitpad_vaccine_by_id(repository, row_id=vaccine_id)
    if row is None:
        raise ResourceNotFoundError("No vaccine with this id.")
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))


@router.patch("/{vaccine_id}", response_model=VisitpadVaccineSingleResponse, summary="Update vaccine")
def patch_vaccine(
    vaccine_id: UUID,
    payload: VisitpadVaccineUpdate,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVaccineSingleResponse:
    row = update_visitpad_vaccine(repository, row_id=vaccine_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No vaccine with this id.")
    session.commit()
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))


@router.delete("/{vaccine_id}", response_model=VisitpadVaccineSingleResponse, summary="Soft-delete vaccine")
def delete_vaccine(
    vaccine_id: UUID,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVaccineSingleResponse:
    row = soft_delete_visitpad_vaccine(repository, row_id=vaccine_id)
    if row is None:
        raise ResourceNotFoundError("No vaccine with this id.")
    session.commit()
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))

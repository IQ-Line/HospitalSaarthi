"""HTTP routes for Visitpad — medicines (`/visitpad/medicines`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_medicine_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_medicine_repository import VisitpadMedicineRepository
from app.schemas.visitpad_medicine import (
    VisitpadMedicineCreate,
    VisitpadMedicineListResponse,
    VisitpadMedicineResponse,
    VisitpadMedicineSchedule,
    VisitpadMedicineSingleResponse,
    VisitpadMedicineUpdate,
)
from app.services.visitpad_medicines_service import (
    create_visitpad_medicine,
    get_visitpad_medicine_by_id,
    list_visitpad_medicines,
    soft_delete_visitpad_medicine,
    update_visitpad_medicine,
)

router = APIRouter(prefix="/visitpad/medicines", tags=["Visitpad — Medicines"])


@router.get("", response_model=VisitpadMedicineListResponse, summary="List medicines")
def get_medicines(
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    schedule: Annotated[VisitpadMedicineSchedule | None, Query()] = None,
) -> VisitpadMedicineListResponse:
    rows, total = list_visitpad_medicines(
        repository,
        search=search,
        schedule=schedule.value if schedule is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadMedicineListResponse(
        data=[VisitpadMedicineResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadMedicineSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create medicine",
)
def post_medicine(
    payload: VisitpadMedicineCreate,
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadMedicineSingleResponse:
    row = create_visitpad_medicine(repository, payload=payload)
    session.commit()
    return VisitpadMedicineSingleResponse(data=VisitpadMedicineResponse.model_validate(row))


@router.get("/{medicine_id}", response_model=VisitpadMedicineSingleResponse, summary="Get medicine")
def get_medicine(
    medicine_id: UUID,
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
) -> VisitpadMedicineSingleResponse:
    row = get_visitpad_medicine_by_id(repository, row_id=medicine_id)
    if row is None:
        raise ResourceNotFoundError("No medicine with this id.")
    return VisitpadMedicineSingleResponse(data=VisitpadMedicineResponse.model_validate(row))


@router.patch("/{medicine_id}", response_model=VisitpadMedicineSingleResponse, summary="Update medicine")
def patch_medicine(
    medicine_id: UUID,
    payload: VisitpadMedicineUpdate,
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadMedicineSingleResponse:
    row = update_visitpad_medicine(
        repository,
        row_id=medicine_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No medicine with this id.")
    session.commit()
    return VisitpadMedicineSingleResponse(data=VisitpadMedicineResponse.model_validate(row))


@router.delete("/{medicine_id}", response_model=VisitpadMedicineSingleResponse, summary="Soft-delete medicine")
def delete_medicine(
    medicine_id: UUID,
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadMedicineSingleResponse:
    row = soft_delete_visitpad_medicine(repository, row_id=medicine_id)
    if row is None:
        raise ResourceNotFoundError("No medicine with this id.")
    session.commit()
    return VisitpadMedicineSingleResponse(data=VisitpadMedicineResponse.model_validate(row))

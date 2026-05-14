"""HTTP routes for Visitpad — manufacturers (`/visitpad/manufacturers`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_manufacturer_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad.manufacturer import VisitpadManufacturerRepository
from app.schemas.visitpad.manufacturer import (
    VisitpadManufacturerCreate,
    VisitpadManufacturerListResponse,
    VisitpadManufacturerResponse,
    VisitpadManufacturerSingleResponse,
    VisitpadManufacturerUpdate,
)
from app.services.visitpad.manufacturers import (
    create_visitpad_manufacturer,
    get_visitpad_manufacturer_by_id,
    list_visitpad_manufacturers,
    soft_delete_visitpad_manufacturer,
    update_visitpad_manufacturer,
)

router = APIRouter(prefix="/visitpad/manufacturers", tags=["Visitpad — Manufacturers"])


@router.get("", response_model=VisitpadManufacturerListResponse, summary="List manufacturers")
def get_manufacturers(
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
) -> VisitpadManufacturerListResponse:
    rows, total = list_visitpad_manufacturers(repository, search=search, limit=limit, offset=offset)
    return VisitpadManufacturerListResponse(
        data=[VisitpadManufacturerResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadManufacturerSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create manufacturer",
)
def post_manufacturer(
    payload: VisitpadManufacturerCreate,
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadManufacturerSingleResponse:
    row = create_visitpad_manufacturer(repository, payload=payload)
    session.commit()
    return VisitpadManufacturerSingleResponse(data=VisitpadManufacturerResponse.model_validate(row))


@router.get("/{manufacturer_id}", response_model=VisitpadManufacturerSingleResponse, summary="Get manufacturer")
def get_manufacturer(
    manufacturer_id: UUID,
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
) -> VisitpadManufacturerSingleResponse:
    row = get_visitpad_manufacturer_by_id(repository, row_id=manufacturer_id)
    if row is None:
        raise ResourceNotFoundError("No manufacturer with this id.")
    return VisitpadManufacturerSingleResponse(data=VisitpadManufacturerResponse.model_validate(row))


@router.patch(
    "/{manufacturer_id}",
    response_model=VisitpadManufacturerSingleResponse,
    summary="Update manufacturer",
)
def patch_manufacturer(
    manufacturer_id: UUID,
    payload: VisitpadManufacturerUpdate,
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadManufacturerSingleResponse:
    row = update_visitpad_manufacturer(repository, row_id=manufacturer_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No manufacturer with this id.")
    session.commit()
    return VisitpadManufacturerSingleResponse(data=VisitpadManufacturerResponse.model_validate(row))


@router.delete(
    "/{manufacturer_id}",
    response_model=VisitpadManufacturerSingleResponse,
    summary="Soft-delete manufacturer",
)
def delete_manufacturer(
    manufacturer_id: UUID,
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadManufacturerSingleResponse:
    row = soft_delete_visitpad_manufacturer(repository, row_id=manufacturer_id)
    if row is None:
        raise ResourceNotFoundError("No manufacturer with this id.")
    session.commit()
    return VisitpadManufacturerSingleResponse(data=VisitpadManufacturerResponse.model_validate(row))

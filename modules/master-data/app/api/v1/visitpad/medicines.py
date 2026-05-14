"""HTTP routes for Visitpad — medicines (`/visitpad/medicines`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_medicine_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.medicine import VisitpadMedicineRepository
from app.schemas.visitpad.medicine import (
    VisitpadMedicineCreate,
    VisitpadMedicineListResponse,
    VisitpadMedicineResponse,
    VisitpadMedicineSchedule,
    VisitpadMedicineSingleResponse,
    VisitpadMedicineUpdate,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.visitpad.medicines import (
    create_visitpad_medicine,
    get_visitpad_medicine_by_id,
    list_visitpad_medicines,
    soft_delete_visitpad_medicine,
    update_visitpad_medicine,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_medicines_from_platform

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


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import medicines from the platform catalog",
)
def post_medicines_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_medicines_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant medicine codes for import-from-platform matching",
)
def get_medicine_import_keys(
    repository: Annotated[VisitpadMedicineRepository, Depends(get_visitpad_medicine_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


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

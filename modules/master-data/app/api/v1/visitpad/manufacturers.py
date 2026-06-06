"""HTTP routes for Visitpad — manufacturers (`/visitpad/manufacturers`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_manufacturer_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.manufacturer import VisitpadManufacturerRepository
from app.schemas.visitpad.manufacturer import (
    VisitpadManufacturerCreate,
    VisitpadManufacturerListResponse,
    VisitpadManufacturerResponse,
    VisitpadManufacturerSingleResponse,
    VisitpadManufacturerUpdate,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.visitpad.manufacturers import (
    create_visitpad_manufacturer,
    get_visitpad_manufacturer_by_id,
    list_visitpad_manufacturers,
    soft_delete_visitpad_manufacturer,
    update_visitpad_manufacturer,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_manufacturers_from_platform

router = APIRouter(prefix="/visitpad/manufacturers", tags=["Visitpad — Manufacturers"])


@router.get("", response_model=VisitpadManufacturerListResponse, summary="List manufacturers")
def get_manufacturers(
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> VisitpadManufacturerListResponse:
    rows, total = list_visitpad_manufacturers(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
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


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import manufacturers from the platform catalog",
)
def post_manufacturers_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_manufacturers_from_platform(
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
    summary="List tenant manufacturer codes (lowercase) for import-from-platform matching",
)
def get_manufacturer_import_keys(
    repository: Annotated[VisitpadManufacturerRepository, Depends(get_visitpad_manufacturer_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


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

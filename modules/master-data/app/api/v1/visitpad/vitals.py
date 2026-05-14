"""HTTP routes for Visitpad — vitals (`/visitpad/vitals`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_vital_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.vital import VisitpadVitalRepository
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.schemas.visitpad.vital import (
    VisitpadVitalCategory,
    VisitpadVitalCreate,
    VisitpadVitalListResponse,
    VisitpadVitalResponse,
    VisitpadVitalSingleResponse,
    VisitpadVitalUpdate,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_vitals_from_platform
from app.services.visitpad.vitals import (
    create_visitpad_vital,
    get_visitpad_vital_by_id,
    list_visitpad_vitals,
    soft_delete_visitpad_vital,
    update_visitpad_vital,
)

router = APIRouter(prefix="/visitpad/vitals", tags=["Visitpad — Vitals"])


@router.get("", response_model=VisitpadVitalListResponse, summary="List vitals")
def get_vitals(
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadVitalCategory | None, Query()] = None,
) -> VisitpadVitalListResponse:
    rows, total = list_visitpad_vitals(
        repository,
        search=search,
        category=category.value if category is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadVitalListResponse(
        data=[VisitpadVitalResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant vital codes for import-from-platform matching",
)
def get_vital_import_keys(
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.post(
    "",
    response_model=VisitpadVitalSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create vital",
)
def post_vital(
    payload: VisitpadVitalCreate,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = create_visitpad_vital(repository, payload=payload)
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import vitals from the platform catalog",
)
def post_vitals_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_vitals_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@router.get("/{vital_id}", response_model=VisitpadVitalSingleResponse, summary="Get vital")
def get_vital(
    vital_id: UUID,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
) -> VisitpadVitalSingleResponse:
    row = get_visitpad_vital_by_id(repository, row_id=vital_id)
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.patch("/{vital_id}", response_model=VisitpadVitalSingleResponse, summary="Update vital")
def patch_vital(
    vital_id: UUID,
    payload: VisitpadVitalUpdate,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = update_visitpad_vital(
        repository,
        row_id=vital_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.delete(
    "/{vital_id}",
    response_model=VisitpadVitalSingleResponse,
    summary="Soft-delete vital",
)
def delete_vital(
    vital_id: UUID,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = soft_delete_visitpad_vital(repository, row_id=vital_id)
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))

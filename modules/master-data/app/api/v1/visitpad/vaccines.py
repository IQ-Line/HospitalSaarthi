"""HTTP routes for Visitpad — vaccines (`/visitpad/vaccines`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_vaccine_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.core.authz import visitpad_guard
from app.repositories.visitpad.vaccine import VisitpadVaccineRepository
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.schemas.visitpad.vaccine import (
    VisitpadVaccineCreate,
    VisitpadVaccineListResponse,
    VisitpadVaccineResponse,
    VisitpadVaccineSingleResponse,
    VisitpadVaccineUpdate,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_vaccines_from_platform
from app.services.visitpad.vaccines import (
    create_visitpad_vaccine,
    get_visitpad_vaccine_by_id,
    list_visitpad_vaccines,
    soft_delete_visitpad_vaccine,
    update_visitpad_vaccine,
)

router = APIRouter(prefix="/visitpad/vaccines", tags=["Visitpad — Vaccines"])

# Tenant-isolated visitpad catalog: writes are capability + iq_tenant_id gated (see
# infra/cerbos/policies/master_data_visitpad.yaml); reads are identity-gate-only.
_GUARD_CREATE = Depends(visitpad_guard("create"))
_GUARD_IMPORT = Depends(visitpad_guard("import"))
_GUARD_UPDATE = Depends(visitpad_guard("update"))
_GUARD_DELETE = Depends(visitpad_guard("delete"))


@router.get("", response_model=VisitpadVaccineListResponse, summary="List vaccines")
def get_vaccines(
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> VisitpadVaccineListResponse:
    rows, total = list_visitpad_vaccines(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return VisitpadVaccineListResponse(
        data=[VisitpadVaccineResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadVaccineSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create vaccine",
    dependencies=[_GUARD_CREATE],
)
def post_vaccine(
    payload: VisitpadVaccineCreate,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVaccineSingleResponse:
    row = create_visitpad_vaccine(repository, payload=payload)
    session.commit()
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import vaccines from the platform catalog",
    dependencies=[_GUARD_IMPORT],
)
def post_vaccines_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_vaccines_from_platform(
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
    summary="List tenant vaccine codes for import-from-platform matching",
)
def get_vaccine_import_keys(
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.get("/{vaccine_id}", response_model=VisitpadVaccineSingleResponse, summary="Get vaccine")
def get_vaccine(
    vaccine_id: UUID,
    repository: Annotated[VisitpadVaccineRepository, Depends(get_visitpad_vaccine_repository)],
) -> VisitpadVaccineSingleResponse:
    row = get_visitpad_vaccine_by_id(repository, row_id=vaccine_id)
    if row is None:
        raise ResourceNotFoundError("No vaccine with this id.")
    return VisitpadVaccineSingleResponse(data=VisitpadVaccineResponse.model_validate(row))


@router.patch(
    "/{vaccine_id}",
    response_model=VisitpadVaccineSingleResponse,
    summary="Update vaccine",
    dependencies=[_GUARD_UPDATE],
)
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


@router.delete(
    "/{vaccine_id}",
    response_model=VisitpadVaccineSingleResponse,
    summary="Soft-delete vaccine",
    dependencies=[_GUARD_DELETE],
)
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

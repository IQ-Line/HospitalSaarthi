"""HTTP routes for Visitpad — procedures (`/visitpad/procedures`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_procedure_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.procedure import VisitpadProcedureRepository
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.schemas.visitpad.procedure import (
    VisitpadProcedureBillingCategory,
    VisitpadProcedureCategory,
    VisitpadProcedureCreate,
    VisitpadProcedureListResponse,
    VisitpadProcedureResponse,
    VisitpadProcedureSingleResponse,
    VisitpadProcedureUpdate,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_procedures_from_platform
from app.services.visitpad.procedures import (
    create_visitpad_procedure,
    get_visitpad_procedure_by_id,
    list_visitpad_procedures,
    soft_delete_visitpad_procedure,
    update_visitpad_procedure,
)

router = APIRouter(prefix="/visitpad/procedures", tags=["Visitpad — Procedures"])


@router.get("", response_model=VisitpadProcedureListResponse, summary="List procedures")
def get_procedures(
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadProcedureCategory | None, Query()] = None,
    billing_category: Annotated[VisitpadProcedureBillingCategory | None, Query()] = None,
) -> VisitpadProcedureListResponse:
    rows, total = list_visitpad_procedures(
        repository,
        search=search,
        category=category.value if category is not None else None,
        billing_category=billing_category.value if billing_category is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadProcedureListResponse(
        data=[VisitpadProcedureResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadProcedureSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create procedure",
)
def post_procedure(
    payload: VisitpadProcedureCreate,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = create_visitpad_procedure(repository, payload=payload)
    session.commit()
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import procedures from the platform catalog",
)
def post_procedures_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_procedures_from_platform(
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
    summary="List tenant procedure CPT codes for import-from-platform matching",
)
def get_procedure_import_keys(
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.get("/{procedure_id}", response_model=VisitpadProcedureSingleResponse, summary="Get procedure")
def get_procedure(
    procedure_id: UUID,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
) -> VisitpadProcedureSingleResponse:
    row = get_visitpad_procedure_by_id(repository, row_id=procedure_id)
    if row is None:
        raise ResourceNotFoundError("No procedure with this id.")
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))


@router.patch("/{procedure_id}", response_model=VisitpadProcedureSingleResponse, summary="Update procedure")
def patch_procedure(
    procedure_id: UUID,
    payload: VisitpadProcedureUpdate,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = update_visitpad_procedure(
        repository,
        row_id=procedure_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No procedure with this id.")
    session.commit()
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))


@router.delete("/{procedure_id}", response_model=VisitpadProcedureSingleResponse, summary="Soft-delete procedure")
def delete_procedure(
    procedure_id: UUID,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = soft_delete_visitpad_procedure(repository, row_id=procedure_id)
    if row is None:
        raise ResourceNotFoundError("No procedure with this id.")
    session.commit()
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))

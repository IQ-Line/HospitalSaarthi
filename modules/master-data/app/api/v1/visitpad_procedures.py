"""HTTP routes for Visitpad — procedures (`/visitpad/procedures`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_platform_tenant_id, get_session, get_visitpad_procedure_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_procedure_repository import VisitpadProcedureRepository
from app.schemas.visitpad_procedure import (
    VisitpadProcedureBillingCategory,
    VisitpadProcedureCategory,
    VisitpadProcedureCreate,
    VisitpadProcedureListResponse,
    VisitpadProcedureResponse,
    VisitpadProcedureSingleResponse,
    VisitpadProcedureUpdate,
)
from app.services.visitpad_procedures_service import (
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
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadProcedureCategory | None, Query()] = None,
    billing_category: Annotated[VisitpadProcedureBillingCategory | None, Query()] = None,
) -> VisitpadProcedureListResponse:
    rows, total = list_visitpad_procedures(
        repository,
        tenant_id=tenant_id,
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
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = create_visitpad_procedure(repository, tenant_id=tenant_id, payload=payload)
    session.commit()
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))


@router.get("/{procedure_id}", response_model=VisitpadProcedureSingleResponse, summary="Get procedure")
def get_procedure(
    procedure_id: UUID,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
) -> VisitpadProcedureSingleResponse:
    row = get_visitpad_procedure_by_id(repository, tenant_id=tenant_id, row_id=procedure_id)
    if row is None:
        raise ResourceNotFoundError("No procedure with this id.")
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))


@router.patch("/{procedure_id}", response_model=VisitpadProcedureSingleResponse, summary="Update procedure")
def patch_procedure(
    procedure_id: UUID,
    payload: VisitpadProcedureUpdate,
    repository: Annotated[VisitpadProcedureRepository, Depends(get_visitpad_procedure_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = update_visitpad_procedure(
        repository,
        tenant_id=tenant_id,
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
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadProcedureSingleResponse:
    row = soft_delete_visitpad_procedure(repository, tenant_id=tenant_id, row_id=procedure_id)
    if row is None:
        raise ResourceNotFoundError("No procedure with this id.")
    session.commit()
    return VisitpadProcedureSingleResponse(data=VisitpadProcedureResponse.model_validate(row))

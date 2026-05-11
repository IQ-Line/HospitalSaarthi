"""HTTP routes for Visitpad — Rx columns (`/visitpad/rx-columns`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_platform_tenant_id, get_session, get_visitpad_rx_column_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_rx_column_repository import VisitpadRxColumnRepository
from app.schemas.visitpad_rx_column import (
    VisitpadRxColumnCreate,
    VisitpadRxColumnListResponse,
    VisitpadRxColumnResponse,
    VisitpadRxColumnSection,
    VisitpadRxColumnSingleResponse,
    VisitpadRxColumnUpdate,
)
from app.services.visitpad_rx_columns_service import (
    create_visitpad_rx_column,
    get_visitpad_rx_column_by_id,
    list_visitpad_rx_columns,
    soft_delete_visitpad_rx_column,
    update_visitpad_rx_column,
)

router = APIRouter(prefix="/visitpad/rx-columns", tags=["Visitpad — Rx columns"])


@router.get("", response_model=VisitpadRxColumnListResponse, summary="List Rx columns")
def get_visitpad_rx_columns(
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    section: Annotated[VisitpadRxColumnSection | None, Query()] = None,
) -> VisitpadRxColumnListResponse:
    rows, total = list_visitpad_rx_columns(
        repository,
        tenant_id=tenant_id,
        search=search,
        section=section.value if section is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadRxColumnListResponse(
        data=[VisitpadRxColumnResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadRxColumnSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Rx column",
)
def post_visitpad_rx_column(
    payload: VisitpadRxColumnCreate,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = create_visitpad_rx_column(repository, tenant_id=tenant_id, payload=payload)
    session.commit()
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))


@router.get("/{rx_column_id}", response_model=VisitpadRxColumnSingleResponse, summary="Get Rx column")
def get_visitpad_rx_column(
    rx_column_id: UUID,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
) -> VisitpadRxColumnSingleResponse:
    row = get_visitpad_rx_column_by_id(repository, tenant_id=tenant_id, row_id=rx_column_id)
    if row is None:
        raise ResourceNotFoundError("No Rx column with this id.")
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))


@router.patch("/{rx_column_id}", response_model=VisitpadRxColumnSingleResponse, summary="Update Rx column")
def patch_visitpad_rx_column(
    rx_column_id: UUID,
    payload: VisitpadRxColumnUpdate,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = update_visitpad_rx_column(
        repository,
        tenant_id=tenant_id,
        row_id=rx_column_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No Rx column with this id.")
    session.commit()
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))


@router.delete("/{rx_column_id}", response_model=VisitpadRxColumnSingleResponse, summary="Soft-delete Rx column")
def delete_visitpad_rx_column(
    rx_column_id: UUID,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = soft_delete_visitpad_rx_column(repository, tenant_id=tenant_id, row_id=rx_column_id)
    if row is None:
        raise ResourceNotFoundError("No Rx column with this id.")
    session.commit()
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))

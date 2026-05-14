"""HTTP routes for Visitpad — Rx columns (`/visitpad/rx-columns`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_rx_column_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.rx_column import VisitpadRxColumnRepository
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.schemas.visitpad.rx_column import (
    VisitpadRxColumnCreate,
    VisitpadRxColumnListResponse,
    VisitpadRxColumnResponse,
    VisitpadRxColumnSection,
    VisitpadRxColumnSingleResponse,
    VisitpadRxColumnUpdate,
)
from app.services.visitpad.platform_bulk_import import import_visitpad_rx_columns_from_platform
from app.services.visitpad.rx_columns import (
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
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    section: Annotated[VisitpadRxColumnSection | None, Query()] = None,
) -> VisitpadRxColumnListResponse:
    rows, total = list_visitpad_rx_columns(
        repository,
        search=search,
        section=section.value if section is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadRxColumnListResponse(
        data=[VisitpadRxColumnResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant Rx column keys (section::code) for import-from-platform matching",
)
def get_rx_column_import_keys(
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    section: Annotated[VisitpadRxColumnSection, Query(description="Same section as the import dialog.")],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(
        data=repository.list_import_key_strings(section=section.value),
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
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = create_visitpad_rx_column(repository, payload=payload)
    session.commit()
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import Rx columns from the platform catalog",
)
def post_rx_columns_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    section: Annotated[VisitpadRxColumnSection, Query(description="Must match the platform row's section.")],
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_rx_columns_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
            section=section,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@router.get("/{rx_column_id}", response_model=VisitpadRxColumnSingleResponse, summary="Get Rx column")
def get_visitpad_rx_column(
    rx_column_id: UUID,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
) -> VisitpadRxColumnSingleResponse:
    row = get_visitpad_rx_column_by_id(repository, row_id=rx_column_id)
    if row is None:
        raise ResourceNotFoundError("No Rx column with this id.")
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))


@router.patch("/{rx_column_id}", response_model=VisitpadRxColumnSingleResponse, summary="Update Rx column")
def patch_visitpad_rx_column(
    rx_column_id: UUID,
    payload: VisitpadRxColumnUpdate,
    repository: Annotated[VisitpadRxColumnRepository, Depends(get_visitpad_rx_column_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = update_visitpad_rx_column(
        repository,
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
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadRxColumnSingleResponse:
    row = soft_delete_visitpad_rx_column(repository, row_id=rx_column_id)
    if row is None:
        raise ResourceNotFoundError("No Rx column with this id.")
    session.commit()
    return VisitpadRxColumnSingleResponse(data=VisitpadRxColumnResponse.model_validate(row))

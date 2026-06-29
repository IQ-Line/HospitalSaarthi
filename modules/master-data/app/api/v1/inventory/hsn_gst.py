"""HTTP routes for Inventory — HSN/GST (`/inventory/hsn-gst`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_hsn_gst_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.hsn_gst import InventoryHsnGstRepository
from app.schemas.inventory.hsn_gst import (
    InventoryHsnGstCreate,
    InventoryHsnGstListResponse,
    InventoryHsnGstResponse,
    InventoryHsnGstSingleResponse,
    InventoryHsnGstUpdate,
)
from app.services.inventory.hsn_gst import (
    create_inventory_hsn_gst,
    get_inventory_hsn_gst_by_id,
    list_inventory_hsn_gst,
    soft_delete_inventory_hsn_gst,
    update_inventory_hsn_gst,
)

router = APIRouter(prefix="/inventory/hsn-gst", tags=["Inventory — HSN/GST"])


@router.get("", response_model=InventoryHsnGstListResponse, summary="List HSN/GST rows")
def get_hsn_gst_rows(
    repository: Annotated[InventoryHsnGstRepository, Depends(get_inventory_hsn_gst_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryHsnGstListResponse:
    rows, total = list_inventory_hsn_gst(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryHsnGstListResponse(
        data=[InventoryHsnGstResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryHsnGstSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create HSN/GST row",
)
def post_hsn_gst(
    payload: InventoryHsnGstCreate,
    repository: Annotated[InventoryHsnGstRepository, Depends(get_inventory_hsn_gst_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryHsnGstSingleResponse:
    row = create_inventory_hsn_gst(repository, payload=payload)
    session.commit()
    return InventoryHsnGstSingleResponse(data=InventoryHsnGstResponse.model_validate(row))


@router.get("/{hsn_gst_id}", response_model=InventoryHsnGstSingleResponse, summary="Get HSN/GST row")
def get_hsn_gst(
    hsn_gst_id: UUID,
    repository: Annotated[InventoryHsnGstRepository, Depends(get_inventory_hsn_gst_repository)],
) -> InventoryHsnGstSingleResponse:
    row = get_inventory_hsn_gst_by_id(repository, row_id=hsn_gst_id)
    if row is None:
        raise ResourceNotFoundError("No HSN/GST row with this id.")
    return InventoryHsnGstSingleResponse(data=InventoryHsnGstResponse.model_validate(row))


@router.patch(
    "/{hsn_gst_id}",
    response_model=InventoryHsnGstSingleResponse,
    summary="Update HSN/GST row",
)
def patch_hsn_gst(
    hsn_gst_id: UUID,
    payload: InventoryHsnGstUpdate,
    repository: Annotated[InventoryHsnGstRepository, Depends(get_inventory_hsn_gst_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryHsnGstSingleResponse:
    row = update_inventory_hsn_gst(repository, row_id=hsn_gst_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No HSN/GST row with this id.")
    session.commit()
    return InventoryHsnGstSingleResponse(data=InventoryHsnGstResponse.model_validate(row))


@router.delete(
    "/{hsn_gst_id}",
    response_model=InventoryHsnGstSingleResponse,
    summary="Soft-delete HSN/GST row",
)
def delete_hsn_gst(
    hsn_gst_id: UUID,
    repository: Annotated[InventoryHsnGstRepository, Depends(get_inventory_hsn_gst_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryHsnGstSingleResponse:
    row = soft_delete_inventory_hsn_gst(repository, row_id=hsn_gst_id)
    if row is None:
        raise ResourceNotFoundError("No HSN/GST row with this id.")
    session.commit()
    return InventoryHsnGstSingleResponse(data=InventoryHsnGstResponse.model_validate(row))

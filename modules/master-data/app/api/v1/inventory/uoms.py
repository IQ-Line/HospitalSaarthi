"""HTTP routes for Inventory — UOMs (`/inventory/uoms`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_uom_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.uom import InventoryUomRepository
from app.schemas.inventory.uom import (
    InventoryUomCreate,
    InventoryUomListResponse,
    InventoryUomResponse,
    InventoryUomSingleResponse,
    InventoryUomUpdate,
)
from app.services.inventory.uoms import (
    create_inventory_uom,
    get_inventory_uom_by_id,
    list_inventory_uoms,
    soft_delete_inventory_uom,
    update_inventory_uom,
)

router = APIRouter(prefix="/inventory/uoms", tags=["Inventory — UOMs"])


@router.get("", response_model=InventoryUomListResponse, summary="List UOMs")
def get_uoms(
    repository: Annotated[InventoryUomRepository, Depends(get_inventory_uom_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryUomListResponse:
    rows, total = list_inventory_uoms(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryUomListResponse(
        data=[InventoryUomResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryUomSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create UOM",
)
def post_uom(
    payload: InventoryUomCreate,
    repository: Annotated[InventoryUomRepository, Depends(get_inventory_uom_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryUomSingleResponse:
    row = create_inventory_uom(repository, payload=payload)
    session.commit()
    return InventoryUomSingleResponse(data=InventoryUomResponse.model_validate(row))


@router.get("/{uom_id}", response_model=InventoryUomSingleResponse, summary="Get UOM")
def get_uom(
    uom_id: UUID,
    repository: Annotated[InventoryUomRepository, Depends(get_inventory_uom_repository)],
) -> InventoryUomSingleResponse:
    row = get_inventory_uom_by_id(repository, row_id=uom_id)
    if row is None:
        raise ResourceNotFoundError("No UOM with this id.")
    return InventoryUomSingleResponse(data=InventoryUomResponse.model_validate(row))


@router.patch("/{uom_id}", response_model=InventoryUomSingleResponse, summary="Update UOM")
def patch_uom(
    uom_id: UUID,
    payload: InventoryUomUpdate,
    repository: Annotated[InventoryUomRepository, Depends(get_inventory_uom_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryUomSingleResponse:
    row = update_inventory_uom(repository, row_id=uom_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No UOM with this id.")
    session.commit()
    return InventoryUomSingleResponse(data=InventoryUomResponse.model_validate(row))


@router.delete("/{uom_id}", response_model=InventoryUomSingleResponse, summary="Soft-delete UOM")
def delete_uom(
    uom_id: UUID,
    repository: Annotated[InventoryUomRepository, Depends(get_inventory_uom_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryUomSingleResponse:
    row = soft_delete_inventory_uom(repository, row_id=uom_id)
    if row is None:
        raise ResourceNotFoundError("No UOM with this id.")
    session.commit()
    return InventoryUomSingleResponse(data=InventoryUomResponse.model_validate(row))

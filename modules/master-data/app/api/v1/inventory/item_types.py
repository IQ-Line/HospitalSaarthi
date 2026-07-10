"""HTTP routes for Inventory — item types (`/inventory/item-types`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_item_type_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.item_type import InventoryItemTypeRepository
from app.schemas.inventory.item_type import (
    InventoryItemTypeCreate,
    InventoryItemTypeListResponse,
    InventoryItemTypeResponse,
    InventoryItemTypeSingleResponse,
    InventoryItemTypeUpdate,
)
from app.services.inventory.item_types import (
    create_inventory_item_type,
    get_inventory_item_type_by_id,
    list_inventory_item_types,
    soft_delete_inventory_item_type,
    update_inventory_item_type,
)

router = APIRouter(prefix="/inventory/item-types", tags=["Inventory — Item Types"])


@router.get("", response_model=InventoryItemTypeListResponse, summary="List item types")
def get_item_types(
    repository: Annotated[InventoryItemTypeRepository, Depends(get_inventory_item_type_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryItemTypeListResponse:
    rows, total = list_inventory_item_types(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryItemTypeListResponse(
        data=[InventoryItemTypeResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryItemTypeSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create item type",
)
def post_item_type(
    payload: InventoryItemTypeCreate,
    repository: Annotated[InventoryItemTypeRepository, Depends(get_inventory_item_type_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryItemTypeSingleResponse:
    row = create_inventory_item_type(repository, payload=payload)
    session.commit()
    return InventoryItemTypeSingleResponse(data=InventoryItemTypeResponse.model_validate(row))


@router.get(
    "/{item_type_id}",
    response_model=InventoryItemTypeSingleResponse,
    summary="Get item type",
)
def get_item_type(
    item_type_id: UUID,
    repository: Annotated[InventoryItemTypeRepository, Depends(get_inventory_item_type_repository)],
) -> InventoryItemTypeSingleResponse:
    row = get_inventory_item_type_by_id(repository, row_id=item_type_id)
    if row is None:
        raise ResourceNotFoundError("No item type with this id.")
    return InventoryItemTypeSingleResponse(data=InventoryItemTypeResponse.model_validate(row))


@router.patch(
    "/{item_type_id}",
    response_model=InventoryItemTypeSingleResponse,
    summary="Update item type",
)
def patch_item_type(
    item_type_id: UUID,
    payload: InventoryItemTypeUpdate,
    repository: Annotated[InventoryItemTypeRepository, Depends(get_inventory_item_type_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryItemTypeSingleResponse:
    row = update_inventory_item_type(repository, row_id=item_type_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No item type with this id.")
    session.commit()
    return InventoryItemTypeSingleResponse(data=InventoryItemTypeResponse.model_validate(row))


@router.delete(
    "/{item_type_id}",
    response_model=InventoryItemTypeSingleResponse,
    summary="Soft-delete item type",
)
def delete_item_type(
    item_type_id: UUID,
    repository: Annotated[InventoryItemTypeRepository, Depends(get_inventory_item_type_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryItemTypeSingleResponse:
    row = soft_delete_inventory_item_type(repository, row_id=item_type_id)
    if row is None:
        raise ResourceNotFoundError("No item type with this id.")
    session.commit()
    return InventoryItemTypeSingleResponse(data=InventoryItemTypeResponse.model_validate(row))

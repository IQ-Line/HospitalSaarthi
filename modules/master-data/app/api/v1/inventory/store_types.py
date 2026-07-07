"""HTTP routes for Inventory — store types (`/inventory/store-types`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_store_type_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.store_type import InventoryStoreTypeRepository
from app.schemas.inventory.store_type import (
    InventoryStoreTypeCreate,
    InventoryStoreTypeListResponse,
    InventoryStoreTypeResponse,
    InventoryStoreTypeSingleResponse,
    InventoryStoreTypeUpdate,
)
from app.services.inventory.store_types import (
    create_inventory_store_type,
    get_inventory_store_type_by_id,
    list_inventory_store_types,
    soft_delete_inventory_store_type,
    update_inventory_store_type,
)

router = APIRouter(prefix="/inventory/store-types", tags=["Inventory — Store Types"])


@router.get("", response_model=InventoryStoreTypeListResponse, summary="List store types")
def get_store_types(
    repository: Annotated[
        InventoryStoreTypeRepository,
        Depends(get_inventory_store_type_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryStoreTypeListResponse:
    rows, total = list_inventory_store_types(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryStoreTypeListResponse(
        data=[InventoryStoreTypeResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryStoreTypeSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create store type",
)
def post_store_type(
    payload: InventoryStoreTypeCreate,
    repository: Annotated[
        InventoryStoreTypeRepository,
        Depends(get_inventory_store_type_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStoreTypeSingleResponse:
    row = create_inventory_store_type(repository, payload=payload)
    session.commit()
    return InventoryStoreTypeSingleResponse(data=InventoryStoreTypeResponse.model_validate(row))


@router.get(
    "/{store_type_id}",
    response_model=InventoryStoreTypeSingleResponse,
    summary="Get store type",
)
def get_store_type(
    store_type_id: UUID,
    repository: Annotated[
        InventoryStoreTypeRepository,
        Depends(get_inventory_store_type_repository),
    ],
) -> InventoryStoreTypeSingleResponse:
    row = get_inventory_store_type_by_id(repository, row_id=store_type_id)
    if row is None:
        raise ResourceNotFoundError("No store type with this id.")
    return InventoryStoreTypeSingleResponse(data=InventoryStoreTypeResponse.model_validate(row))


@router.patch(
    "/{store_type_id}",
    response_model=InventoryStoreTypeSingleResponse,
    summary="Update store type",
)
def patch_store_type(
    store_type_id: UUID,
    payload: InventoryStoreTypeUpdate,
    repository: Annotated[
        InventoryStoreTypeRepository,
        Depends(get_inventory_store_type_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStoreTypeSingleResponse:
    row = update_inventory_store_type(repository, row_id=store_type_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No store type with this id.")
    session.commit()
    return InventoryStoreTypeSingleResponse(data=InventoryStoreTypeResponse.model_validate(row))


@router.delete(
    "/{store_type_id}",
    response_model=InventoryStoreTypeSingleResponse,
    summary="Soft-delete store type",
)
def delete_store_type(
    store_type_id: UUID,
    repository: Annotated[
        InventoryStoreTypeRepository,
        Depends(get_inventory_store_type_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStoreTypeSingleResponse:
    row = soft_delete_inventory_store_type(repository, row_id=store_type_id)
    if row is None:
        raise ResourceNotFoundError("No store type with this id.")
    session.commit()
    return InventoryStoreTypeSingleResponse(data=InventoryStoreTypeResponse.model_validate(row))

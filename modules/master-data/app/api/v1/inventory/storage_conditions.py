"""HTTP routes for Inventory — storage conditions (`/inventory/storage-conditions`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_storage_condition_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.storage_condition import InventoryStorageConditionRepository
from app.schemas.inventory.storage_condition import (
    InventoryStorageConditionCreate,
    InventoryStorageConditionListResponse,
    InventoryStorageConditionResponse,
    InventoryStorageConditionSingleResponse,
    InventoryStorageConditionUpdate,
)
from app.services.inventory.storage_conditions import (
    create_inventory_storage_condition,
    get_inventory_storage_condition_by_id,
    list_inventory_storage_conditions,
    soft_delete_inventory_storage_condition,
    update_inventory_storage_condition,
)

router = APIRouter(
    prefix="/inventory/storage-conditions",
    tags=["Inventory — Storage Conditions"],
)


@router.get(
    "",
    response_model=InventoryStorageConditionListResponse,
    summary="List storage conditions",
)
def get_storage_conditions(
    repository: Annotated[
        InventoryStorageConditionRepository,
        Depends(get_inventory_storage_condition_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryStorageConditionListResponse:
    rows, total = list_inventory_storage_conditions(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryStorageConditionListResponse(
        data=[InventoryStorageConditionResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryStorageConditionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create storage condition",
)
def post_storage_condition(
    payload: InventoryStorageConditionCreate,
    repository: Annotated[
        InventoryStorageConditionRepository,
        Depends(get_inventory_storage_condition_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStorageConditionSingleResponse:
    row = create_inventory_storage_condition(repository, payload=payload)
    session.commit()
    return InventoryStorageConditionSingleResponse(
        data=InventoryStorageConditionResponse.model_validate(row),
    )


@router.get(
    "/{storage_condition_id}",
    response_model=InventoryStorageConditionSingleResponse,
    summary="Get storage condition",
)
def get_storage_condition(
    storage_condition_id: UUID,
    repository: Annotated[
        InventoryStorageConditionRepository,
        Depends(get_inventory_storage_condition_repository),
    ],
) -> InventoryStorageConditionSingleResponse:
    row = get_inventory_storage_condition_by_id(repository, row_id=storage_condition_id)
    if row is None:
        raise ResourceNotFoundError("No storage condition with this id.")
    return InventoryStorageConditionSingleResponse(
        data=InventoryStorageConditionResponse.model_validate(row),
    )


@router.patch(
    "/{storage_condition_id}",
    response_model=InventoryStorageConditionSingleResponse,
    summary="Update storage condition",
)
def patch_storage_condition(
    storage_condition_id: UUID,
    payload: InventoryStorageConditionUpdate,
    repository: Annotated[
        InventoryStorageConditionRepository,
        Depends(get_inventory_storage_condition_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStorageConditionSingleResponse:
    row = update_inventory_storage_condition(
        repository,
        row_id=storage_condition_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No storage condition with this id.")
    session.commit()
    return InventoryStorageConditionSingleResponse(
        data=InventoryStorageConditionResponse.model_validate(row),
    )


@router.delete(
    "/{storage_condition_id}",
    response_model=InventoryStorageConditionSingleResponse,
    summary="Soft-delete storage condition",
)
def delete_storage_condition(
    storage_condition_id: UUID,
    repository: Annotated[
        InventoryStorageConditionRepository,
        Depends(get_inventory_storage_condition_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryStorageConditionSingleResponse:
    row = soft_delete_inventory_storage_condition(repository, row_id=storage_condition_id)
    if row is None:
        raise ResourceNotFoundError("No storage condition with this id.")
    session.commit()
    return InventoryStorageConditionSingleResponse(
        data=InventoryStorageConditionResponse.model_validate(row),
    )

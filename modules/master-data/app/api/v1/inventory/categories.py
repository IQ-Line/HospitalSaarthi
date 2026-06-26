"""HTTP routes for Inventory — categories (`/inventory/categories`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_inventory_category_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.inventory.category import InventoryCategoryRepository
from app.schemas.inventory.category import (
    InventoryCategoryCreate,
    InventoryCategoryListResponse,
    InventoryCategoryResponse,
    InventoryCategorySingleResponse,
    InventoryCategoryUpdate,
)
from app.services.inventory.categories import (
    create_inventory_category,
    get_inventory_category_by_id,
    list_inventory_categories,
    soft_delete_inventory_category,
    update_inventory_category,
)

router = APIRouter(prefix="/inventory/categories", tags=["Inventory — Categories"])


@router.get("", response_model=InventoryCategoryListResponse, summary="List categories")
def get_categories(
    repository: Annotated[InventoryCategoryRepository, Depends(get_inventory_category_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> InventoryCategoryListResponse:
    rows, total = list_inventory_categories(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return InventoryCategoryListResponse(
        data=[InventoryCategoryResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=InventoryCategorySingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create category",
)
def post_category(
    payload: InventoryCategoryCreate,
    repository: Annotated[InventoryCategoryRepository, Depends(get_inventory_category_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryCategorySingleResponse:
    row = create_inventory_category(repository, payload=payload)
    session.commit()
    return InventoryCategorySingleResponse(data=InventoryCategoryResponse.model_validate(row))


@router.get("/{category_id}", response_model=InventoryCategorySingleResponse, summary="Get category")
def get_category(
    category_id: UUID,
    repository: Annotated[InventoryCategoryRepository, Depends(get_inventory_category_repository)],
) -> InventoryCategorySingleResponse:
    row = get_inventory_category_by_id(repository, row_id=category_id)
    if row is None:
        raise ResourceNotFoundError("No category with this id.")
    return InventoryCategorySingleResponse(data=InventoryCategoryResponse.model_validate(row))


@router.patch(
    "/{category_id}",
    response_model=InventoryCategorySingleResponse,
    summary="Update category",
)
def patch_category(
    category_id: UUID,
    payload: InventoryCategoryUpdate,
    repository: Annotated[InventoryCategoryRepository, Depends(get_inventory_category_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryCategorySingleResponse:
    row = update_inventory_category(repository, row_id=category_id, payload=payload)
    if row is None:
        raise ResourceNotFoundError("No category with this id.")
    session.commit()
    return InventoryCategorySingleResponse(data=InventoryCategoryResponse.model_validate(row))


@router.delete(
    "/{category_id}",
    response_model=InventoryCategorySingleResponse,
    summary="Soft-delete category",
)
def delete_category(
    category_id: UUID,
    repository: Annotated[InventoryCategoryRepository, Depends(get_inventory_category_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> InventoryCategorySingleResponse:
    row = soft_delete_inventory_category(repository, row_id=category_id)
    if row is None:
        raise ResourceNotFoundError("No category with this id.")
    session.commit()
    return InventoryCategorySingleResponse(data=InventoryCategoryResponse.model_validate(row))

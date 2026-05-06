"""HTTP routes for permission catalog (`/permissions`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_permission_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.permission_repository import PermissionRepository
from app.schemas.permission import (
    PermissionAction,
    PermissionCreate,
    PermissionListResponse,
    PermissionResponse,
    PermissionSingleResponse,
    PermissionUpdate,
)
from app.services.permission_service import (
    create_permission,
    get_permission_by_id,
    get_permission_by_slug,
    list_permissions,
    soft_delete_permission,
    update_permission,
)

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("", response_model=PermissionListResponse, summary="List permission definitions")
def get_permissions(
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    action: Annotated[PermissionAction | None, Query()] = None,
) -> PermissionListResponse:
    rows = list_permissions(repository, action=action)
    data = [PermissionResponse.model_validate(row) for row in rows]
    return PermissionListResponse(data=data, total=len(data))


@router.post(
    "",
    response_model=PermissionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a permission",
)
def post_permission(
    payload: PermissionCreate,
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PermissionSingleResponse:
    row = create_permission(repository, payload, actor_id=None)
    session.commit()
    return PermissionSingleResponse(data=PermissionResponse.model_validate(row))


@router.get(
    "/by-slug/{slug}",
    response_model=PermissionSingleResponse,
    summary="Get one permission by slug",
)
def get_permission_by_slug_route(
    slug: str,
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
) -> PermissionSingleResponse:
    row = get_permission_by_slug(repository, slug)
    if row is None:
        raise ResourceNotFoundError(f"No permission with slug '{slug}'.")
    return PermissionSingleResponse(data=PermissionResponse.model_validate(row))


@router.get(
    "/{permission_id}",
    response_model=PermissionSingleResponse,
    summary="Get one permission by id",
)
def get_permission_by_id_route(
    permission_id: UUID,
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
) -> PermissionSingleResponse:
    row = get_permission_by_id(repository, permission_id)
    if row is None:
        raise ResourceNotFoundError("No permission with this id.")
    return PermissionSingleResponse(data=PermissionResponse.model_validate(row))


@router.patch(
    "/{permission_id}",
    response_model=PermissionSingleResponse,
    summary="Update a permission",
)
def patch_permission(
    permission_id: UUID,
    payload: PermissionUpdate,
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PermissionSingleResponse:
    row = update_permission(repository, permission_id, payload, actor_id=None)
    session.commit()
    return PermissionSingleResponse(data=PermissionResponse.model_validate(row))


@router.delete(
    "/{permission_id}",
    response_model=PermissionSingleResponse,
    summary="Soft-delete a permission",
)
def delete_permission(
    permission_id: UUID,
    repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PermissionSingleResponse:
    row = soft_delete_permission(repository, permission_id, actor_id=None)
    session.commit()
    return PermissionSingleResponse(data=PermissionResponse.model_validate(row))

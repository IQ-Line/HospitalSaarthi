"""HTTP routes for module↔permission links (`/module-permissions`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_module_permission_repository,
    get_module_repository,
    get_permission_repository,
    get_session,
)
from app.api.errors import ResourceNotFoundError
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository
from app.schemas.module_permission import (
    ModulePermissionCreate,
    ModulePermissionListResponse,
    ModulePermissionResponse,
    ModulePermissionSingleResponse,
    ModulePermissionUpdate,
)
from app.services.module_permission_service import (
    create_module_permission,
    get_module_permission_by_id,
    get_module_permission_by_slug,
    list_module_permissions,
    soft_delete_module_permission,
    update_module_permission,
)

router = APIRouter(prefix="/module-permissions", tags=["Module permissions"])


@router.get(
    "",
    response_model=ModulePermissionListResponse,
    summary="List module↔permission links",
)
def get_module_permissions(
    repository: Annotated[ModulePermissionRepository, Depends(get_module_permission_repository)],
    module_id: Annotated[UUID | None, Query()] = None,
    permission_id: Annotated[UUID | None, Query()] = None,
) -> ModulePermissionListResponse:
    rows = list_module_permissions(
        repository,
        module_id=module_id,
        permission_id=permission_id,
    )
    data = [ModulePermissionResponse.model_validate(r) for r in rows]
    return ModulePermissionListResponse(data=data, total=len(data))


@router.post(
    "",
    response_model=ModulePermissionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module↔permission link",
)
def post_module_permission(
    payload: ModulePermissionCreate,
    mp_repository: Annotated[
        ModulePermissionRepository,
        Depends(get_module_permission_repository),
    ],
    module_repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    permission_repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> ModulePermissionSingleResponse:
    row = create_module_permission(
        mp_repository,
        module_repository,
        permission_repository,
        payload,
        actor_id=None,
    )
    session.commit()
    return ModulePermissionSingleResponse(data=ModulePermissionResponse.model_validate(row))


@router.get(
    "/by-slug/{slug}",
    response_model=ModulePermissionSingleResponse,
    summary="Get one link by slug",
)
def get_module_permission_by_slug_route(
    slug: str,
    repository: Annotated[ModulePermissionRepository, Depends(get_module_permission_repository)],
) -> ModulePermissionSingleResponse:
    row = get_module_permission_by_slug(repository, slug)
    if row is None:
        raise ResourceNotFoundError(f"No module-permission link with slug '{slug}'.")
    return ModulePermissionSingleResponse(data=ModulePermissionResponse.model_validate(row))


@router.get(
    "/{module_permission_id}",
    response_model=ModulePermissionSingleResponse,
    summary="Get one link by id",
)
def get_module_permission_by_id_route(
    module_permission_id: UUID,
    repository: Annotated[ModulePermissionRepository, Depends(get_module_permission_repository)],
) -> ModulePermissionSingleResponse:
    row = get_module_permission_by_id(repository, module_permission_id)
    if row is None:
        raise ResourceNotFoundError("No module-permission link with this id.")
    return ModulePermissionSingleResponse(data=ModulePermissionResponse.model_validate(row))


@router.patch(
    "/{module_permission_id}",
    response_model=ModulePermissionSingleResponse,
    summary="Update a module↔permission link",
)
def patch_module_permission(
    module_permission_id: UUID,
    payload: ModulePermissionUpdate,
    mp_repository: Annotated[
        ModulePermissionRepository,
        Depends(get_module_permission_repository),
    ],
    module_repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    permission_repository: Annotated[PermissionRepository, Depends(get_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> ModulePermissionSingleResponse:
    row = update_module_permission(
        mp_repository,
        module_repository,
        permission_repository,
        module_permission_id,
        payload,
        actor_id=None,
    )
    session.commit()
    return ModulePermissionSingleResponse(data=ModulePermissionResponse.model_validate(row))


@router.delete(
    "/{module_permission_id}",
    response_model=ModulePermissionSingleResponse,
    summary="Soft-delete a module↔permission link",
)
def delete_module_permission(
    module_permission_id: UUID,
    repository: Annotated[ModulePermissionRepository, Depends(get_module_permission_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> ModulePermissionSingleResponse:
    row = soft_delete_module_permission(repository, module_permission_id, actor_id=None)
    session.commit()
    return ModulePermissionSingleResponse(data=ModulePermissionResponse.model_validate(row))

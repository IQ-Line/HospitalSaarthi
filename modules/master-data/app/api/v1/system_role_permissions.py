"""HTTP routes for system_role↔permission links (`/system-role-permissions`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_session,
    get_system_role_permission_repository,
    resolve_actor_id,
)
from app.api.errors import ResourceNotFoundError
from app.core.authz import guard
from app.repositories.system_role_permission_repository import SystemRolePermissionRepository
from app.schemas.system_role_permission import (
    SystemRolePermissionCreate,
    SystemRolePermissionListResponse,
    SystemRolePermissionResponse,
    SystemRolePermissionSingleResponse,
    SystemRolePermissionUpdate,
)
from app.services.system_role_permission_service import (
    create_system_role_permission,
    get_system_role_permission_by_id,
    get_system_role_permission_by_slug,
    list_system_role_permissions,
    soft_delete_system_role_permission,
    update_system_role_permission,
)

router = APIRouter(prefix="/system-role-permissions", tags=["System role permissions"])

# Global catalog: writes are capability-gated (no tenant equality); reads are identity-gate-only.
# Reuses the existing ``master_data:system_role`` Cerbos resource — this junction is part of the
# same system-role catalog surface, so no new policy resource is introduced (corpus untouched).
_GUARD_CREATE = Depends(guard("master_data:system_role", "create"))
_GUARD_UPDATE = Depends(guard("master_data:system_role", "update"))
_GUARD_DELETE = Depends(guard("master_data:system_role", "delete"))


@router.get(
    "",
    response_model=SystemRolePermissionListResponse,
    summary="List system_role↔permission links",
)
def get_system_role_permissions(
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
    system_role_id: Annotated[UUID | None, Query()] = None,
    permission_id: Annotated[UUID | None, Query()] = None,
) -> SystemRolePermissionListResponse:
    rows = list_system_role_permissions(
        repository,
        system_role_id=system_role_id,
        permission_id=permission_id,
    )
    data = [SystemRolePermissionResponse.model_validate(r) for r in rows]
    return SystemRolePermissionListResponse(data=data, total=len(data))


@router.post(
    "",
    response_model=SystemRolePermissionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a system_role↔permission link",
    dependencies=[_GUARD_CREATE],
)
def post_system_role_permission(
    payload: SystemRolePermissionCreate,
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> SystemRolePermissionSingleResponse:
    row = create_system_role_permission(repository, payload, actor_id=actor_id)
    session.commit()
    return SystemRolePermissionSingleResponse(
        data=SystemRolePermissionResponse.model_validate(row)
    )


@router.get(
    "/by-slug/{slug}",
    response_model=SystemRolePermissionSingleResponse,
    summary="Get one link by slug",
)
def get_system_role_permission_by_slug_route(
    slug: str,
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
) -> SystemRolePermissionSingleResponse:
    row = get_system_role_permission_by_slug(repository, slug)
    if row is None:
        raise ResourceNotFoundError(f"No system-role-permission link with slug '{slug}'.")
    return SystemRolePermissionSingleResponse(
        data=SystemRolePermissionResponse.model_validate(row)
    )


@router.get(
    "/{system_role_permission_id}",
    response_model=SystemRolePermissionSingleResponse,
    summary="Get one link by id",
)
def get_system_role_permission_by_id_route(
    system_role_permission_id: UUID,
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
) -> SystemRolePermissionSingleResponse:
    row = get_system_role_permission_by_id(repository, system_role_permission_id)
    if row is None:
        raise ResourceNotFoundError("No system-role-permission link with this id.")
    return SystemRolePermissionSingleResponse(
        data=SystemRolePermissionResponse.model_validate(row)
    )


@router.patch(
    "/{system_role_permission_id}",
    response_model=SystemRolePermissionSingleResponse,
    summary="Update a system_role↔permission link",
    dependencies=[_GUARD_UPDATE],
)
def patch_system_role_permission(
    system_role_permission_id: UUID,
    payload: SystemRolePermissionUpdate,
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> SystemRolePermissionSingleResponse:
    row = update_system_role_permission(
        repository, system_role_permission_id, payload, actor_id=actor_id
    )
    session.commit()
    return SystemRolePermissionSingleResponse(
        data=SystemRolePermissionResponse.model_validate(row)
    )


@router.delete(
    "/{system_role_permission_id}",
    response_model=SystemRolePermissionSingleResponse,
    summary="Soft-delete a system_role↔permission link",
    dependencies=[_GUARD_DELETE],
)
def delete_system_role_permission(
    system_role_permission_id: UUID,
    repository: Annotated[
        SystemRolePermissionRepository,
        Depends(get_system_role_permission_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> SystemRolePermissionSingleResponse:
    row = soft_delete_system_role_permission(
        repository, system_role_permission_id, actor_id=actor_id
    )
    session.commit()
    return SystemRolePermissionSingleResponse(
        data=SystemRolePermissionResponse.model_validate(row)
    )

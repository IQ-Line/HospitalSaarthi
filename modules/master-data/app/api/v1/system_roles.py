"""HTTP routes for system role templates (`/system-roles`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from hims_authz.dependency import require_authz

from app.api.deps import get_session, get_system_role_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.system_role_repository import SystemRoleRepository
from app.schemas.system_role import (
    SystemRoleCreate,
    SystemRoleListResponse,
    SystemRoleResponse,
    SystemRoleSingleResponse,
    SystemRoleUpdate,
)
from app.services.system_role_service import (
    create_system_role,
    get_system_role_by_id,
    get_system_role_by_slug,
    list_system_roles,
    soft_delete_system_role,
    update_system_role,
)

router = APIRouter(prefix="/system-roles", tags=["System roles"])


@router.get("", response_model=SystemRoleListResponse, summary="List system role templates", dependencies=[Depends(require_authz("master_data:platform", "catalog.read"))])
def get_system_roles(
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
    is_template: Annotated[bool | None, Query()] = None,
) -> SystemRoleListResponse:
    rows = list_system_roles(repository, is_template=is_template)
    data = [SystemRoleResponse.model_validate(r) for r in rows]
    return SystemRoleListResponse(data=data, total=len(data))


@router.post(
    "",
    response_model=SystemRoleSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a system role template",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.create"))],
)
def post_system_role(
    payload: SystemRoleCreate,
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> SystemRoleSingleResponse:
    row = create_system_role(repository, payload, actor_id=None)
    session.commit()
    return SystemRoleSingleResponse(data=SystemRoleResponse.model_validate(row))


@router.get(
    "/by-slug/{slug}",
    response_model=SystemRoleSingleResponse,
    summary="Get one system role by slug",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.read"))],
)
def get_system_role_by_slug_route(
    slug: str,
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
) -> SystemRoleSingleResponse:
    row = get_system_role_by_slug(repository, slug)
    if row is None:
        raise ResourceNotFoundError(f"No system role with slug '{slug}'.")
    return SystemRoleSingleResponse(data=SystemRoleResponse.model_validate(row))


@router.get(
    "/{system_role_id}",
    response_model=SystemRoleSingleResponse,
    summary="Get one system role by id",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.read"))],
)
def get_system_role_by_id_route(
    system_role_id: UUID,
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
) -> SystemRoleSingleResponse:
    row = get_system_role_by_id(repository, system_role_id)
    if row is None:
        raise ResourceNotFoundError("No system role with this id.")
    return SystemRoleSingleResponse(data=SystemRoleResponse.model_validate(row))


@router.patch(
    "/{system_role_id}",
    response_model=SystemRoleSingleResponse,
    summary="Update a system role template",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.update"))],
)
def patch_system_role(
    system_role_id: UUID,
    payload: SystemRoleUpdate,
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> SystemRoleSingleResponse:
    row = update_system_role(repository, system_role_id, payload, actor_id=None)
    session.commit()
    return SystemRoleSingleResponse(data=SystemRoleResponse.model_validate(row))


@router.delete(
    "/{system_role_id}",
    response_model=SystemRoleSingleResponse,
    summary="Soft-delete a system role template",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.delete"))],
)
def delete_system_role(
    system_role_id: UUID,
    repository: Annotated[SystemRoleRepository, Depends(get_system_role_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> SystemRoleSingleResponse:
    row = soft_delete_system_role(repository, system_role_id, actor_id=None)
    session.commit()
    return SystemRoleSingleResponse(data=SystemRoleResponse.model_validate(row))

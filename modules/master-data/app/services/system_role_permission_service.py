"""Use-cases for system_role_permissions junction catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import system_role_permission_model
from app.repositories.system_role_permission_repository import SystemRolePermissionRepository
from app.schemas.system_role_permission import (
    SystemRolePermissionCreate,
    SystemRolePermissionUpdate,
)


class SystemRolePermissionNotFoundError(Exception):
    """No junction row for id/slug scope."""


def list_system_role_permissions(
    repository: SystemRolePermissionRepository,
    *,
    system_role_id: UUID | None = None,
    permission_id: UUID | None = None,
) -> list[Any]:
    return repository.list_system_role_permissions(
        system_role_id=system_role_id,
        permission_id=permission_id,
    )


def get_system_role_permission_by_id(
    repository: SystemRolePermissionRepository,
    row_id: UUID,
) -> Any | None:
    return repository.get_system_role_permission_by_id(row_id)


def get_system_role_permission_by_slug(
    repository: SystemRolePermissionRepository,
    slug: str,
) -> Any | None:
    return repository.get_system_role_permission_by_slug(slug)


def create_system_role_permission(
    repository: SystemRolePermissionRepository,
    payload: SystemRolePermissionCreate,
    *,
    actor_id: UUID | None,
) -> Any:
    M = system_role_permission_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        slug=payload.slug,
        system_role_id=payload.system_role_id,
        permission_id=payload.permission_id,
        is_default=payload.is_default,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["iq_tenant_id"] = repository.scope.iq_tenant_id
    row = M(**kwargs)
    return repository.create_system_role_permission(row)


def update_system_role_permission(
    repository: SystemRolePermissionRepository,
    row_id: UUID,
    payload: SystemRolePermissionUpdate,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_system_role_permission_by_id(row_id, include_deleted=True)
    if row is None:
        raise SystemRolePermissionNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "slug" in data:
        row.slug = data["slug"]
    if "is_default" in data:
        row.is_default = data["is_default"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    return repository.update_system_role_permission(row)


def soft_delete_system_role_permission(
    repository: SystemRolePermissionRepository,
    row_id: UUID,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_system_role_permission_by_id(row_id, include_deleted=True)
    if row is None:
        raise SystemRolePermissionNotFoundError
    if row.is_deleted:
        return row
    row.is_deleted = True
    row.updated_by = actor_id
    return repository.update_system_role_permission(row)

"""Use-cases for permission catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import permission_model
from app.repositories.permission_repository import PermissionRepository
from app.schemas.permission import PermissionAction, PermissionCreate, PermissionUpdate


class PermissionNotFoundError(Exception):
    """No permission found for id/reader scope."""


def list_permissions(
    repository: PermissionRepository,
    *,
    action: PermissionAction | None = None,
) -> list[Any]:
    return repository.list_permissions(action=action)


def get_permission_by_id(
    repository: PermissionRepository,
    permission_id: UUID,
) -> Any | None:
    return repository.get_permission_by_id(permission_id)


def get_permission_by_slug(
    repository: PermissionRepository,
    slug: str,
) -> Any | None:
    return repository.get_permission_by_slug(slug)


def create_permission(
    repository: PermissionRepository,
    payload: PermissionCreate,
    *,
    actor_id: UUID | None,
) -> Any:
    M = permission_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        name=payload.name,
        slug=payload.slug,
        action=payload.action.value,
        description=payload.description,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["iq_tenant_id"] = repository.scope.iq_tenant_id
    row = M(**kwargs)
    return repository.create_permission(row)


def update_permission(
    repository: PermissionRepository,
    permission_id: UUID,
    payload: PermissionUpdate,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_permission_by_id(permission_id, include_deleted=True)
    if row is None:
        raise PermissionNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"]
    if "slug" in data:
        row.slug = data["slug"]
    if "action" in data:
        raw = data["action"]
        row.action = raw.value if hasattr(raw, "value") else raw
    if "description" in data:
        row.description = data["description"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    return repository.update_permission(row)


def soft_delete_permission(
    repository: PermissionRepository,
    permission_id: UUID,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_permission_by_id(permission_id, include_deleted=True)
    if row is None:
        raise PermissionNotFoundError
    if row.is_deleted:
        return row
    row.is_deleted = True
    row.updated_by = actor_id
    return repository.update_permission(row)

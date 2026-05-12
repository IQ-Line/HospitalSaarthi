"""Use-cases for system role template catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import system_role_model
from app.repositories.system_role_repository import SystemRoleRepository
from app.schemas.system_role import SystemRoleCreate, SystemRoleUpdate


class SystemRoleNotFoundError(Exception):
    """No system role found for id/slug scope."""


def list_system_roles(
    repository: SystemRoleRepository,
    *,
    is_template: bool | None = None,
) -> list[Any]:
    return repository.list_system_roles(is_template=is_template)


def get_system_role_by_id(
    repository: SystemRoleRepository,
    role_id: UUID,
) -> Any | None:
    return repository.get_system_role_by_id(role_id)


def get_system_role_by_slug(
    repository: SystemRoleRepository,
    slug: str,
) -> Any | None:
    return repository.get_system_role_by_slug(slug)


def create_system_role(
    repository: SystemRoleRepository,
    payload: SystemRoleCreate,
    *,
    actor_id: UUID | None,
) -> Any:
    M = system_role_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        name=payload.name,
        slug=payload.slug,
        is_template=payload.is_template,
        description=payload.description,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["tenant_id"] = repository.scope.tenant_id
    row = M(**kwargs)
    return repository.create_system_role(row)


def update_system_role(
    repository: SystemRoleRepository,
    role_id: UUID,
    payload: SystemRoleUpdate,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_system_role_by_id(role_id, include_deleted=True)
    if row is None:
        raise SystemRoleNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"]
    if "slug" in data:
        row.slug = data["slug"]
    if "description" in data:
        row.description = data["description"]
    if "is_template" in data:
        row.is_template = data["is_template"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    return repository.update_system_role(row)


def soft_delete_system_role(
    repository: SystemRoleRepository,
    role_id: UUID,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_system_role_by_id(role_id, include_deleted=True)
    if row is None:
        raise SystemRoleNotFoundError
    if row.is_deleted:
        return row
    row.is_deleted = True
    row.updated_by = actor_id
    return repository.update_system_role(row)

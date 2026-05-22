"""Use-cases for system role template catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import system_role_model
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.system_role_repository import SystemRoleRepository
from app.schemas.system_role import (
    SystemRoleCreate,
    SystemRoleResponse,
    SystemRoleUpdate,
)

ROLE_TYPES_PICKLIST_SLUG = "role-types"


class SystemRoleNotFoundError(Exception):
    """No system role found for id/slug scope."""


class InvalidRoleTypeError(Exception):
    """role_type is not an active picklist value."""

    def __init__(self, role_type: str) -> None:
        self.role_type = role_type
        self.message = f"role_type '{role_type}' is not an active role-types picklist value."
        super().__init__(self.message)


def _validate_role_type(picklist_repository: PicklistRepository, role_type: str) -> None:
    active_values = picklist_repository.list_active_values_for_picklist_slug(ROLE_TYPES_PICKLIST_SLUG)
    allowed = {row.value for row in active_values}
    if role_type not in allowed:
        raise InvalidRoleTypeError(role_type)


def _to_response(row: Any) -> SystemRoleResponse:
    payload = {
        column.name: getattr(row, column.name)
        for column in row.__table__.columns
    }
    return SystemRoleResponse.model_validate(payload)


def list_system_roles(
    repository: SystemRoleRepository,
    *,
    is_template: bool | None = None,
) -> list[SystemRoleResponse]:
    rows = repository.list_system_roles(is_template=is_template)
    return [_to_response(row) for row in rows]


def get_system_role_by_id(
    repository: SystemRoleRepository,
    role_id: UUID,
) -> SystemRoleResponse | None:
    row = repository.get_system_role_by_id(role_id)
    if row is None:
        return None
    return _to_response(row)


def get_system_role_by_slug(
    repository: SystemRoleRepository,
    slug: str,
) -> SystemRoleResponse | None:
    row = repository.get_system_role_by_slug(slug)
    if row is None:
        return None
    return _to_response(row)


def create_system_role(
    repository: SystemRoleRepository,
    picklist_repository: PicklistRepository,
    payload: SystemRoleCreate,
    *,
    actor_id: UUID | None,
) -> SystemRoleResponse:
    _validate_role_type(picklist_repository, payload.role_type)
    M = system_role_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        name=payload.name,
        slug=payload.slug,
        is_template=payload.is_template,
        description=payload.description,
        role_type=payload.role_type,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["iq_tenant_id"] = repository.scope.iq_tenant_id
    row = M(**kwargs)
    created = repository.create_system_role(row)
    return _to_response(created)


def update_system_role(
    repository: SystemRoleRepository,
    picklist_repository: PicklistRepository,
    role_id: UUID,
    payload: SystemRoleUpdate,
    *,
    actor_id: UUID | None,
) -> SystemRoleResponse:
    row = repository.get_system_role_by_id(role_id, include_deleted=True)
    if row is None:
        raise SystemRoleNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "role_type" in data and data["role_type"] is not None:
        _validate_role_type(picklist_repository, data["role_type"])
    if "name" in data:
        row.name = data["name"]
    if "slug" in data:
        row.slug = data["slug"]
    if "description" in data:
        row.description = data["description"]
    if "role_type" in data:
        row.role_type = data["role_type"]
    if "is_template" in data:
        row.is_template = data["is_template"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    updated = repository.update_system_role(row)
    return _to_response(updated)


def soft_delete_system_role(
    repository: SystemRoleRepository,
    role_id: UUID,
    *,
    actor_id: UUID | None,
) -> SystemRoleResponse:
    row = repository.get_system_role_by_id(role_id, include_deleted=True)
    if row is None:
        raise SystemRoleNotFoundError
    if row.is_deleted:
        return _to_response(row)
    row.is_deleted = True
    row.updated_by = actor_id
    updated = repository.update_system_role(row)
    return _to_response(updated)

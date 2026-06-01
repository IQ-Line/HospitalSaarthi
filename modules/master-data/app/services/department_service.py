"""Use-cases for hospital department catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import department_model
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentType, DepartmentUpdate


class DepartmentNotFoundError(Exception):
    """No department found for id/reader scope."""


def list_departments(
    repository: DepartmentRepository,
    *,
    search: str | None = None,
    department_type: DepartmentType | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Any], int]:
    return repository.list_departments(
        search=search,
        department_type=department_type,
        limit=limit,
        offset=offset,
    )


def get_department_by_id(
    repository: DepartmentRepository,
    department_id: UUID,
) -> Any | None:
    return repository.get_department_by_id(department_id)


def create_department(
    repository: DepartmentRepository,
    payload: DepartmentCreate,
    *,
    actor_id: UUID | None,
) -> Any:
    M = department_model(repository.scope)
    kwargs: dict[str, Any] = dict(
        name=payload.name.strip(),
        code=payload.code.strip().lower(),
        type=payload.type.value,
        description=payload.description.strip() if payload.description else None,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    if repository.scope.is_tenant:
        kwargs["iq_tenant_id"] = repository.scope.iq_tenant_id
    row = M(**kwargs)
    return repository.create_department(row)


def update_department(
    repository: DepartmentRepository,
    department_id: UUID,
    payload: DepartmentUpdate,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_department_by_id(department_id, include_deleted=True)
    if row is None:
        raise DepartmentNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"].strip()
    if "code" in data:
        row.code = data["code"].strip().lower()
    if "type" in data:
        raw = data["type"]
        row.type = raw.value if hasattr(raw, "value") else raw
    if "description" in data:
        desc = data["description"]
        row.description = desc.strip() if isinstance(desc, str) and desc.strip() else None
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    return repository.update_department(row)


def soft_delete_department(
    repository: DepartmentRepository,
    department_id: UUID,
    *,
    actor_id: UUID | None,
) -> Any:
    row = repository.get_department_by_id(department_id, include_deleted=True)
    if row is None:
        raise DepartmentNotFoundError
    if row.is_deleted:
        return row
    row.is_deleted = True
    row.updated_by = actor_id
    return repository.update_department(row)

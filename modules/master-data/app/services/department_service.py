"""Use-cases for hospital department catalog."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.catalog.platform_table_models import department_model
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentType


def list_departments(
    repository: DepartmentRepository,
    *,
    department_type: DepartmentType | None = None,
) -> list[Any]:
    return repository.list_departments(department_type=department_type)


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

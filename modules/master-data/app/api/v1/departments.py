"""HTTP routes for hospital department catalog (`/departments`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from hims_authz.dependency import require_authz

from app.api.deps import get_department_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentSingleResponse,
    DepartmentType,
    DepartmentUpdate,
)
from app.services.department_service import (
    create_department,
    get_department_by_id,
    list_departments,
    soft_delete_department,
    update_department,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=DepartmentListResponse, summary="List departments", dependencies=[Depends(require_authz("master_data:platform", "catalog.read"))])
def get_departments(
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    department_type: Annotated[DepartmentType | None, Query(alias="type")] = None,
) -> DepartmentListResponse:
    rows = list_departments(repository, department_type=department_type)
    data = [DepartmentResponse.model_validate(row) for row in rows]
    return DepartmentListResponse(data=data, total=len(data))


@router.post(
    "",
    response_model=DepartmentSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a department",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.create"))],
)
def post_department(
    payload: DepartmentCreate,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> DepartmentSingleResponse:
    row = create_department(repository, payload, actor_id=None)
    session.commit()
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))


@router.get(
    "/{department_id}",
    response_model=DepartmentSingleResponse,
    summary="Get one department by id",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.read"))],
)
def get_department_by_id_route(
    department_id: UUID,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
) -> DepartmentSingleResponse:
    row = get_department_by_id(repository, department_id)
    if row is None:
        raise ResourceNotFoundError("No department with this id.")
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))


@router.patch(
    "/{department_id}",
    response_model=DepartmentSingleResponse,
    summary="Update a department",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.update"))],
)
def patch_department(
    department_id: UUID,
    payload: DepartmentUpdate,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> DepartmentSingleResponse:
    row = update_department(repository, department_id, payload, actor_id=None)
    session.commit()
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))


@router.delete(
    "/{department_id}",
    response_model=DepartmentSingleResponse,
    summary="Soft-delete a department",
    dependencies=[Depends(require_authz("master_data:platform", "catalog.delete"))],
)
def delete_department(
    department_id: UUID,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> DepartmentSingleResponse:
    row = soft_delete_department(repository, department_id, actor_id=None)
    session.commit()
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))

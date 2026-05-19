"""HTTP routes for hospital department catalog (`/departments`)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_department_repository, get_session
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentSingleResponse,
    DepartmentType,
)
from app.services.department_service import create_department, list_departments

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=DepartmentListResponse, summary="List departments")
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
)
def post_department(
    payload: DepartmentCreate,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> DepartmentSingleResponse:
    row = create_department(repository, payload, actor_id=None)
    session.commit()
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))

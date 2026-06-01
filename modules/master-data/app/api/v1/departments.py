"""HTTP routes for hospital department catalog (`/departments`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_department_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentSingleResponse,
    DepartmentType,
    DepartmentUpdate,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.department_platform_import import import_departments_from_platform
from app.services.department_service import (
    create_department,
    get_department_by_id,
    list_departments,
    soft_delete_department,
    update_department,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=DepartmentListResponse, summary="List departments")
def get_departments(
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    department_type: Annotated[DepartmentType | None, Query(alias="type")] = None,
) -> DepartmentListResponse:
    rows, total = list_departments(
        repository,
        search=search,
        department_type=department_type,
        limit=limit,
        offset=offset,
    )
    data = [DepartmentResponse.model_validate(row) for row in rows]
    return DepartmentListResponse(data=data, total=total)


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


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import departments from the platform catalog",
)
def post_departments_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_departments_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant department codes (lowercase) for import-from-platform matching",
)
def get_department_import_keys(
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.get(
    "/{department_id}",
    response_model=DepartmentSingleResponse,
    summary="Get one department by id",
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
)
def delete_department(
    department_id: UUID,
    repository: Annotated[DepartmentRepository, Depends(get_department_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> DepartmentSingleResponse:
    row = soft_delete_department(repository, department_id, actor_id=None)
    session.commit()
    return DepartmentSingleResponse(data=DepartmentResponse.model_validate(row))

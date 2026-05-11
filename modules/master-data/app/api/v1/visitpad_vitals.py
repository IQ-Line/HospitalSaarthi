"""HTTP routes for Visitpad — vitals (`/visitpad/vitals`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_platform_tenant_id, get_session, get_visitpad_vital_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_vital_repository import VisitpadVitalRepository
from app.schemas.visitpad_vital import (
    VisitpadVitalCategory,
    VisitpadVitalCreate,
    VisitpadVitalListResponse,
    VisitpadVitalResponse,
    VisitpadVitalSingleResponse,
    VisitpadVitalUpdate,
)
from app.services.visitpad_vitals_service import (
    create_visitpad_vital,
    get_visitpad_vital_by_id,
    list_visitpad_vitals,
    soft_delete_visitpad_vital,
    update_visitpad_vital,
)

router = APIRouter(prefix="/visitpad/vitals", tags=["Visitpad — Vitals"])


@router.get("", response_model=VisitpadVitalListResponse, summary="List vitals")
def get_vitals(
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadVitalCategory | None, Query()] = None,
) -> VisitpadVitalListResponse:
    rows, total = list_visitpad_vitals(
        repository,
        tenant_id=tenant_id,
        search=search,
        category=category.value if category is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadVitalListResponse(
        data=[VisitpadVitalResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadVitalSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create vital",
)
def post_vital(
    payload: VisitpadVitalCreate,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = create_visitpad_vital(repository, tenant_id=tenant_id, payload=payload)
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.get("/{vital_id}", response_model=VisitpadVitalSingleResponse, summary="Get vital")
def get_vital(
    vital_id: UUID,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
) -> VisitpadVitalSingleResponse:
    row = get_visitpad_vital_by_id(repository, tenant_id=tenant_id, row_id=vital_id)
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.patch("/{vital_id}", response_model=VisitpadVitalSingleResponse, summary="Update vital")
def patch_vital(
    vital_id: UUID,
    payload: VisitpadVitalUpdate,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = update_visitpad_vital(
        repository,
        tenant_id=tenant_id,
        row_id=vital_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))


@router.delete("/{vital_id}", response_model=VisitpadVitalSingleResponse, summary="Soft-delete vital")
def delete_vital(
    vital_id: UUID,
    repository: Annotated[VisitpadVitalRepository, Depends(get_visitpad_vital_repository)],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadVitalSingleResponse:
    row = soft_delete_visitpad_vital(repository, tenant_id=tenant_id, row_id=vital_id)
    if row is None:
        raise ResourceNotFoundError("No vital with this id.")
    session.commit()
    return VisitpadVitalSingleResponse(data=VisitpadVitalResponse.model_validate(row))

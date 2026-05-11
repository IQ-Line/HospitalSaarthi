"""HTTP routes for Visitpad — chronic illnesses (`/visitpad/chronic-illnesses`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_platform_tenant_id, get_session, get_visitpad_chronic_illness_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.visitpad_chronic_illness_repository import VisitpadChronicIllnessRepository
from app.schemas.visitpad_chronic_illness import (
    VisitpadChronicIllnessCategory,
    VisitpadChronicIllnessCreate,
    VisitpadChronicIllnessListResponse,
    VisitpadChronicIllnessResponse,
    VisitpadChronicIllnessSingleResponse,
    VisitpadChronicIllnessUpdate,
)
from app.services.visitpad_chronic_illnesses_service import (
    create_visitpad_chronic_illness,
    get_visitpad_chronic_illness_by_id,
    list_visitpad_chronic_illnesses,
    soft_delete_visitpad_chronic_illness,
    update_visitpad_chronic_illness,
)

router = APIRouter(prefix="/visitpad/chronic-illnesses", tags=["Visitpad — Chronic illnesses"])


@router.get("", response_model=VisitpadChronicIllnessListResponse, summary="List chronic illnesses")
def get_chronic_illnesses(
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadChronicIllnessCategory | None, Query()] = None,
) -> VisitpadChronicIllnessListResponse:
    rows, total = list_visitpad_chronic_illnesses(
        repository,
        tenant_id=tenant_id,
        search=search,
        category=category.value if category is not None else None,
        limit=limit,
        offset=offset,
    )
    return VisitpadChronicIllnessListResponse(
        data=[VisitpadChronicIllnessResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post(
    "",
    response_model=VisitpadChronicIllnessSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create chronic illness",
)
def post_chronic_illness(
    payload: VisitpadChronicIllnessCreate,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = create_visitpad_chronic_illness(repository, tenant_id=tenant_id, payload=payload)
    session.commit()
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))


@router.get(
    "/{chronic_illness_id}",
    response_model=VisitpadChronicIllnessSingleResponse,
    summary="Get chronic illness",
)
def get_chronic_illness(
    chronic_illness_id: UUID,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
) -> VisitpadChronicIllnessSingleResponse:
    row = get_visitpad_chronic_illness_by_id(repository, tenant_id=tenant_id, row_id=chronic_illness_id)
    if row is None:
        raise ResourceNotFoundError("No chronic illness with this id.")
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))


@router.patch(
    "/{chronic_illness_id}",
    response_model=VisitpadChronicIllnessSingleResponse,
    summary="Update chronic illness",
)
def patch_chronic_illness(
    chronic_illness_id: UUID,
    payload: VisitpadChronicIllnessUpdate,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = update_visitpad_chronic_illness(
        repository,
        tenant_id=tenant_id,
        row_id=chronic_illness_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No chronic illness with this id.")
    session.commit()
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))


@router.delete(
    "/{chronic_illness_id}",
    response_model=VisitpadChronicIllnessSingleResponse,
    summary="Soft-delete chronic illness",
)
def delete_chronic_illness(
    chronic_illness_id: UUID,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    tenant_id: Annotated[UUID, Depends(get_platform_tenant_id)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = soft_delete_visitpad_chronic_illness(repository, tenant_id=tenant_id, row_id=chronic_illness_id)
    if row is None:
        raise ResourceNotFoundError("No chronic illness with this id.")
    session.commit()
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))

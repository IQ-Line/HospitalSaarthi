"""HTTP routes for picklist domains and nested picklist values (items)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_picklist_repository, get_picklist_value_repository, get_session
from app.api.errors import ResourceNotFoundError
from app.repositories.picklist_repository import PicklistRepository
from app.repositories.picklist_value_repository import PicklistValueRepository
from app.schemas.picklist import PicklistListResponse, PicklistResponse, PicklistSingleResponse
from app.schemas.picklist_value import (
    PicklistValueCreate,
    PicklistValueListResponse,
    PicklistValueResponse,
    PicklistValueSingleResponse,
    PicklistValueUpdate,
)
from app.services.picklist_service import (
    PicklistNotFoundError,
    get_picklist_by_id,
    get_picklist_by_slug,
    list_picklists,
)
from app.services.picklist_value_service import (
    PicklistValueNotFoundError,
    create_picklist_value,
    deactivate_picklist_value,
    get_picklist_value_by_id,
    get_picklist_value_by_slug,
    list_picklist_values,
    update_picklist_value,
)

router = APIRouter(prefix="/picklists", tags=["Picklists"])


@router.get("", response_model=PicklistListResponse, summary="List picklist domains")
def get_picklists(
    repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
) -> PicklistListResponse:
    rows = list_picklists(repository)
    data = [PicklistResponse.model_validate(row) for row in rows]
    return PicklistListResponse(data=data, total=len(data))


@router.get(
    "/by-slug/{slug}",
    response_model=PicklistSingleResponse,
    summary="Get one picklist domain by slug",
)
def get_picklist_by_slug_route(
    slug: str,
    repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
) -> PicklistSingleResponse:
    row = get_picklist_by_slug(repository, slug)
    if row is None:
        raise ResourceNotFoundError(f"No picklist with slug '{slug}'.")
    return PicklistSingleResponse(data=PicklistResponse.model_validate(row))


@router.get(
    "/{picklist_id}/values",
    response_model=PicklistValueListResponse,
    summary="List values for a picklist domain",
)
def get_picklist_values(
    picklist_id: UUID,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
    is_active: Annotated[bool | None, Query()] = None,
) -> PicklistValueListResponse:
    try:
        rows = list_picklist_values(
            picklist_repository,
            value_repository,
            picklist_id,
            is_active=is_active,
        )
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    data = [PicklistValueResponse.model_validate(row) for row in rows]
    return PicklistValueListResponse(data=data, total=len(data))


@router.post(
    "/{picklist_id}/values",
    response_model=PicklistValueSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a picklist value",
)
def post_picklist_value(
    picklist_id: UUID,
    payload: PicklistValueCreate,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PicklistValueSingleResponse:
    try:
        row = create_picklist_value(picklist_repository, value_repository, picklist_id, payload)
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    session.commit()
    return PicklistValueSingleResponse(data=PicklistValueResponse.model_validate(row))


@router.get(
    "/{picklist_id}/values/by-slug/{slug}",
    response_model=PicklistValueSingleResponse,
    summary="Get one picklist value by slug",
)
def get_picklist_value_by_slug_route(
    picklist_id: UUID,
    slug: str,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
) -> PicklistValueSingleResponse:
    try:
        row = get_picklist_value_by_slug(picklist_repository, value_repository, picklist_id, slug)
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    if row is None:
        raise ResourceNotFoundError(f"No picklist value with slug '{slug}' for this picklist.")
    return PicklistValueSingleResponse(data=PicklistValueResponse.model_validate(row))


@router.get(
    "/{picklist_id}/values/{value_id}",
    response_model=PicklistValueSingleResponse,
    summary="Get one picklist value by id",
)
def get_picklist_value_by_id_route(
    picklist_id: UUID,
    value_id: UUID,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
) -> PicklistValueSingleResponse:
    try:
        row = get_picklist_value_by_id(
            picklist_repository,
            value_repository,
            picklist_id,
            value_id,
        )
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    if row is None:
        raise ResourceNotFoundError("No picklist value with this id for this picklist.")
    return PicklistValueSingleResponse(data=PicklistValueResponse.model_validate(row))


@router.patch(
    "/{picklist_id}/values/{value_id}",
    response_model=PicklistValueSingleResponse,
    summary="Update a picklist value",
)
def patch_picklist_value(
    picklist_id: UUID,
    value_id: UUID,
    payload: PicklistValueUpdate,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PicklistValueSingleResponse:
    try:
        row = update_picklist_value(
            picklist_repository,
            value_repository,
            picklist_id,
            value_id,
            payload,
        )
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    except PicklistValueNotFoundError:
        raise ResourceNotFoundError("No picklist value with this id for this picklist.") from None
    session.commit()
    return PicklistValueSingleResponse(data=PicklistValueResponse.model_validate(row))


@router.delete(
    "/{picklist_id}/values/{value_id}",
    response_model=PicklistValueSingleResponse,
    summary="Deactivate a picklist value (sets is_active false)",
)
def delete_picklist_value(
    picklist_id: UUID,
    value_id: UUID,
    picklist_repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    value_repository: Annotated[PicklistValueRepository, Depends(get_picklist_value_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> PicklistValueSingleResponse:
    try:
        row = deactivate_picklist_value(
            picklist_repository,
            value_repository,
            picklist_id,
            value_id,
        )
    except PicklistNotFoundError:
        raise ResourceNotFoundError("No picklist with this id.") from None
    except PicklistValueNotFoundError:
        raise ResourceNotFoundError("No picklist value with this id for this picklist.") from None
    session.commit()
    return PicklistValueSingleResponse(data=PicklistValueResponse.model_validate(row))


@router.get(
    "/{picklist_id}",
    response_model=PicklistSingleResponse,
    summary="Get one picklist domain by id",
)
def get_picklist_by_id_route(
    picklist_id: UUID,
    repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
) -> PicklistSingleResponse:
    row = get_picklist_by_id(repository, picklist_id)
    if row is None:
        raise ResourceNotFoundError("No picklist with this id.")
    return PicklistSingleResponse(data=PicklistResponse.model_validate(row))

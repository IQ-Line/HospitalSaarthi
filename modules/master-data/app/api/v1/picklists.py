"""HTTP routes for platform picklist catalog (`/picklists`)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_picklist_repository
from app.api.errors import ResourceNotFoundError
from app.repositories.picklist_repository import PicklistRepository
from app.schemas.picklist import (
    PicklistListResponse,
    PicklistResponse,
    PicklistValueListResponse,
    PicklistValueResponse,
)
from app.services.picklist_service import (
    list_picklist_values,
    list_picklists,
    resolve_picklist,
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
    "/{picklist_key}/values",
    response_model=PicklistValueListResponse,
    summary="List values for a picklist domain",
)
def get_picklist_values(
    picklist_key: str,
    repository: Annotated[PicklistRepository, Depends(get_picklist_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PicklistValueListResponse:
    picklist = resolve_picklist(repository, picklist_key)
    if picklist is None:
        raise ResourceNotFoundError("No picklist with this id.")
    rows, total = list_picklist_values(
        repository,
        picklist.id,
        limit=limit,
        offset=offset,
    )
    return PicklistValueListResponse(
        data=[PicklistValueResponse.model_validate(row) for row in rows],
        total=total,
    )

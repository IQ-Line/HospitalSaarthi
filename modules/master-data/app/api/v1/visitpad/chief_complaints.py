"""HTTP routes for Visitpad — chief complaints (`/visitpad/chief-complaints`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_chief_complaint_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.chief_complaint import VisitpadChiefComplaintRepository
from app.schemas.visitpad.chief_complaint import (
    VisitpadBodySystem,
    VisitpadChiefComplaintCreate,
    VisitpadChiefComplaintDescriptor,
    VisitpadChiefComplaintListResponse,
    VisitpadChiefComplaintResponse,
    VisitpadChiefComplaintSingleResponse,
    VisitpadChiefComplaintUpdate,
    VisitpadTriagePriority,
    build_visitpad_chief_complaint_descriptor,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.visitpad.chief_complaints import (
    create_visitpad_chief_complaint,
    get_visitpad_chief_complaint_by_id,
    list_visitpad_chief_complaints,
    soft_delete_visitpad_chief_complaint,
    update_visitpad_chief_complaint,
)
from app.services.visitpad.platform_bulk_import import (
    import_visitpad_chief_complaints_from_platform,
)

router = APIRouter(prefix="/visitpad/chief-complaints", tags=["Visitpad — Chief complaints"])


@router.get("", response_model=VisitpadChiefComplaintListResponse, summary="List chief complaints")
def get_chief_complaints(
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    body_system: Annotated[VisitpadBodySystem | None, Query()] = None,
    triage_priority: Annotated[VisitpadTriagePriority | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> VisitpadChiefComplaintListResponse:
    rows, total = list_visitpad_chief_complaints(
        repository,
        search=search,
        body_system=body_system.value if body_system is not None else None,
        triage_priority=triage_priority.value if triage_priority is not None else None,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return VisitpadChiefComplaintListResponse(
        data=[VisitpadChiefComplaintResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.get(
    "/descriptor",
    response_model=VisitpadChiefComplaintDescriptor,
    summary="Chief complaint form descriptor",
)
def get_chief_complaint_descriptor() -> VisitpadChiefComplaintDescriptor:
    """Dropdown values and labels — derived from the same enums as create/update (no duplicate client constants)."""
    return build_visitpad_chief_complaint_descriptor()


@router.post(
    "",
    response_model=VisitpadChiefComplaintSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create chief complaint",
)
def post_chief_complaint(
    payload: VisitpadChiefComplaintCreate,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = create_visitpad_chief_complaint(repository, payload=payload)
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import chief complaints from the platform catalog",
)
def post_chief_complaints_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_chief_complaints_from_platform(
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
    summary="List tenant chief complaint codes for import-from-platform matching",
)
def get_chief_complaint_import_keys(
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.get(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Get chief complaint",
)
def get_chief_complaint(
    chief_complaint_id: UUID,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
) -> VisitpadChiefComplaintSingleResponse:
    row = get_visitpad_chief_complaint_by_id(repository, row_id=chief_complaint_id)
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.patch(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Update chief complaint",
)
def patch_chief_complaint(
    chief_complaint_id: UUID,
    payload: VisitpadChiefComplaintUpdate,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = update_visitpad_chief_complaint(
        repository,
        row_id=chief_complaint_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )


@router.delete(
    "/{chief_complaint_id}",
    response_model=VisitpadChiefComplaintSingleResponse,
    summary="Soft-delete chief complaint",
)
def delete_chief_complaint(
    chief_complaint_id: UUID,
    repository: Annotated[
        VisitpadChiefComplaintRepository,
        Depends(get_visitpad_chief_complaint_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChiefComplaintSingleResponse:
    row = soft_delete_visitpad_chief_complaint(repository, row_id=chief_complaint_id)
    if row is None:
        raise ResourceNotFoundError("No chief complaint with this id.")
    session.commit()
    return VisitpadChiefComplaintSingleResponse(
        data=VisitpadChiefComplaintResponse.model_validate(row),
    )

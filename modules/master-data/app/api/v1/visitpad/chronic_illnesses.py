"""HTTP routes for Visitpad — chronic illnesses (`/visitpad/chronic-illnesses`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from hims_authz.dependency import require_authz
from sqlalchemy.orm import Session

from app.api.deps import get_session, get_visitpad_chronic_illness_repository
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.chronic_illness import VisitpadChronicIllnessRepository
from app.schemas.visitpad.chronic_illness import (
    VisitpadChronicIllnessCategory,
    VisitpadChronicIllnessCreate,
    VisitpadChronicIllnessListResponse,
    VisitpadChronicIllnessResponse,
    VisitpadChronicIllnessSingleResponse,
    VisitpadChronicIllnessUpdate,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.visitpad.chronic_illnesses import (
    create_visitpad_chronic_illness,
    get_visitpad_chronic_illness_by_id,
    list_visitpad_chronic_illnesses,
    soft_delete_visitpad_chronic_illness,
    update_visitpad_chronic_illness,
)
from app.services.visitpad.platform_bulk_import import (
    import_visitpad_chronic_illnesses_from_platform,
)

router = APIRouter(prefix="/visitpad/chronic-illnesses", tags=["Visitpad — Chronic illnesses"])


@router.get("", response_model=VisitpadChronicIllnessListResponse, summary="List chronic illnesses", dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.read"))])
def get_chronic_illnesses(
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    category: Annotated[VisitpadChronicIllnessCategory | None, Query()] = None,
) -> VisitpadChronicIllnessListResponse:
    rows, total = list_visitpad_chronic_illnesses(
        repository,
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
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.create"))],
)
def post_chronic_illness(
    payload: VisitpadChronicIllnessCreate,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = create_visitpad_chronic_illness(repository, payload=payload)
    session.commit()
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))


@router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import chronic illnesses from the platform catalog",
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.create"))],
)
def post_chronic_illnesses_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_chronic_illnesses_from_platform(
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
    summary="List tenant chronic illness ICD-10 codes for import-from-platform matching",
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.read"))],
)
def get_chronic_illness_import_keys(
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@router.get(
    "/{chronic_illness_id}",
    response_model=VisitpadChronicIllnessSingleResponse,
    summary="Get chronic illness",
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.read"))],
)
def get_chronic_illness(
    chronic_illness_id: UUID,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
) -> VisitpadChronicIllnessSingleResponse:
    row = get_visitpad_chronic_illness_by_id(repository, row_id=chronic_illness_id)
    if row is None:
        raise ResourceNotFoundError("No chronic illness with this id.")
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))


@router.patch(
    "/{chronic_illness_id}",
    response_model=VisitpadChronicIllnessSingleResponse,
    summary="Update chronic illness",
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.update"))],
)
def patch_chronic_illness(
    chronic_illness_id: UUID,
    payload: VisitpadChronicIllnessUpdate,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = update_visitpad_chronic_illness(
        repository,
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
    dependencies=[Depends(require_authz("master_data:visitpad", "visitpad.delete"))],
)
def delete_chronic_illness(
    chronic_illness_id: UUID,
    repository: Annotated[
        VisitpadChronicIllnessRepository,
        Depends(get_visitpad_chronic_illness_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadChronicIllnessSingleResponse:
    row = soft_delete_visitpad_chronic_illness(repository, row_id=chronic_illness_id)
    if row is None:
        raise ResourceNotFoundError("No chronic illness with this id.")
    session.commit()
    return VisitpadChronicIllnessSingleResponse(data=VisitpadChronicIllnessResponse.model_validate(row))

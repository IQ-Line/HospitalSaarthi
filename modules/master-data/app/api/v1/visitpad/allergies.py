"""HTTP routes for Visitpad — allergens and allergy reactions."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_session,
    get_visitpad_allergen_repository,
    get_visitpad_allergy_reaction_repository,
)
from app.api.errors import ResourceNotFoundError
from app.api.v1.visitpad.catalog_http import require_visitpad_tenant_catalog_scope
from app.repositories.visitpad.allergen import VisitpadAllergenRepository
from app.repositories.visitpad.allergy_reaction import VisitpadAllergyReactionRepository
from app.schemas.visitpad.allergen import (
    VisitpadAllergenCreate,
    VisitpadAllergenListResponse,
    VisitpadAllergenResponse,
    VisitpadAllergenSingleResponse,
    VisitpadAllergenType,
    VisitpadAllergenUpdate,
    VisitpadAllergyReactionCreate,
    VisitpadAllergyReactionListResponse,
    VisitpadAllergyReactionResponse,
    VisitpadAllergyReactionSingleResponse,
    VisitpadAllergyReactionUpdate,
)
from app.schemas.visitpad.platform_import import (
    VisitpadCatalogKeysResponse,
    VisitpadPlatformImportRequest,
    VisitpadPlatformImportSingleResponse,
)
from app.services.visitpad.allergies import (
    create_visitpad_allergen,
    create_visitpad_allergy_reaction,
    get_visitpad_allergen_by_id,
    get_visitpad_allergy_reaction_by_id,
    list_visitpad_allergens,
    list_visitpad_allergy_reactions,
    soft_delete_visitpad_allergen,
    soft_delete_visitpad_allergy_reaction,
    update_visitpad_allergen,
    update_visitpad_allergy_reaction,
)
from app.services.visitpad.platform_bulk_import import (
    import_visitpad_allergens_from_platform,
    import_visitpad_allergy_reactions_from_platform,
)

allergens_router = APIRouter(prefix="/visitpad/allergens", tags=["Visitpad — Allergens"])
reactions_router = APIRouter(
    prefix="/visitpad/allergy-reactions",
    tags=["Visitpad — Allergy reactions"],
)


@allergens_router.get("", response_model=VisitpadAllergenListResponse, summary="List allergens")
def get_allergens(
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    allergen_type: Annotated[VisitpadAllergenType | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> VisitpadAllergenListResponse:
    rows, total = list_visitpad_allergens(
        repository,
        search=search,
        allergen_type=allergen_type.value if allergen_type is not None else None,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return VisitpadAllergenListResponse(
        data=[VisitpadAllergenResponse.model_validate(r) for r in rows],
        total=total,
    )


@allergens_router.post(
    "",
    response_model=VisitpadAllergenSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create allergen",
)
def post_allergen(
    payload: VisitpadAllergenCreate,
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergenSingleResponse:
    row = create_visitpad_allergen(repository, payload=payload)
    session.commit()
    return VisitpadAllergenSingleResponse(data=VisitpadAllergenResponse.model_validate(row))


@allergens_router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import allergens from the platform catalog",
)
def post_allergens_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_allergens_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@allergens_router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant allergen codes for import-from-platform matching",
)
def get_allergen_import_keys(
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@allergens_router.get("/{allergen_id}", response_model=VisitpadAllergenSingleResponse, summary="Get allergen")
def get_allergen(
    allergen_id: UUID,
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
) -> VisitpadAllergenSingleResponse:
    row = get_visitpad_allergen_by_id(repository, row_id=allergen_id)
    if row is None:
        raise ResourceNotFoundError("No allergen with this id.")
    return VisitpadAllergenSingleResponse(data=VisitpadAllergenResponse.model_validate(row))


@allergens_router.patch("/{allergen_id}", response_model=VisitpadAllergenSingleResponse, summary="Update allergen")
def patch_allergen(
    allergen_id: UUID,
    payload: VisitpadAllergenUpdate,
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergenSingleResponse:
    row = update_visitpad_allergen(
        repository,
        row_id=allergen_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No allergen with this id.")
    session.commit()
    return VisitpadAllergenSingleResponse(data=VisitpadAllergenResponse.model_validate(row))


@allergens_router.delete("/{allergen_id}", response_model=VisitpadAllergenSingleResponse, summary="Soft-delete allergen")
def delete_allergen(
    allergen_id: UUID,
    repository: Annotated[VisitpadAllergenRepository, Depends(get_visitpad_allergen_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergenSingleResponse:
    row = soft_delete_visitpad_allergen(repository, row_id=allergen_id)
    if row is None:
        raise ResourceNotFoundError("No allergen with this id.")
    session.commit()
    return VisitpadAllergenSingleResponse(data=VisitpadAllergenResponse.model_validate(row))


@reactions_router.get("", response_model=VisitpadAllergyReactionListResponse, summary="List reactions")
def get_reactions(
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> VisitpadAllergyReactionListResponse:
    rows, total = list_visitpad_allergy_reactions(
        repository,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return VisitpadAllergyReactionListResponse(
        data=[VisitpadAllergyReactionResponse.model_validate(r) for r in rows],
        total=total,
    )


@reactions_router.post(
    "",
    response_model=VisitpadAllergyReactionSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create reaction",
)
def post_reaction(
    payload: VisitpadAllergyReactionCreate,
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergyReactionSingleResponse:
    row = create_visitpad_allergy_reaction(repository, payload=payload)
    session.commit()
    return VisitpadAllergyReactionSingleResponse(data=VisitpadAllergyReactionResponse.model_validate(row))


@reactions_router.post(
    "/import-from-platform",
    response_model=VisitpadPlatformImportSingleResponse,
    summary="Bulk-import allergy reactions from the platform catalog",
)
def post_allergy_reactions_import_from_platform(
    payload: VisitpadPlatformImportRequest,
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadPlatformImportSingleResponse:
    try:
        data = import_visitpad_allergy_reactions_from_platform(
            session,
            scope=repository.scope,
            tenant_repo=repository,
            platform_row_ids=payload.platform_row_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    session.commit()
    return VisitpadPlatformImportSingleResponse(data=data)


@reactions_router.get(
    "/keys",
    response_model=VisitpadCatalogKeysResponse,
    summary="List tenant allergy reaction codes for import-from-platform matching",
)
def get_allergy_reaction_import_keys(
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
) -> VisitpadCatalogKeysResponse:
    require_visitpad_tenant_catalog_scope(repository.scope)
    return VisitpadCatalogKeysResponse(data=repository.list_import_key_strings())


@reactions_router.get(
    "/{reaction_id}",
    response_model=VisitpadAllergyReactionSingleResponse,
    summary="Get reaction",
)
def get_reaction(
    reaction_id: UUID,
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
) -> VisitpadAllergyReactionSingleResponse:
    row = get_visitpad_allergy_reaction_by_id(repository, row_id=reaction_id)
    if row is None:
        raise ResourceNotFoundError("No allergy reaction with this id.")
    return VisitpadAllergyReactionSingleResponse(data=VisitpadAllergyReactionResponse.model_validate(row))


@reactions_router.patch(
    "/{reaction_id}",
    response_model=VisitpadAllergyReactionSingleResponse,
    summary="Update reaction",
)
def patch_reaction(
    reaction_id: UUID,
    payload: VisitpadAllergyReactionUpdate,
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergyReactionSingleResponse:
    row = update_visitpad_allergy_reaction(
        repository,
        row_id=reaction_id,
        payload=payload,
    )
    if row is None:
        raise ResourceNotFoundError("No allergy reaction with this id.")
    session.commit()
    return VisitpadAllergyReactionSingleResponse(data=VisitpadAllergyReactionResponse.model_validate(row))


@reactions_router.delete(
    "/{reaction_id}",
    response_model=VisitpadAllergyReactionSingleResponse,
    summary="Soft-delete reaction",
)
def delete_reaction(
    reaction_id: UUID,
    repository: Annotated[
        VisitpadAllergyReactionRepository,
        Depends(get_visitpad_allergy_reaction_repository),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> VisitpadAllergyReactionSingleResponse:
    row = soft_delete_visitpad_allergy_reaction(repository, row_id=reaction_id)
    if row is None:
        raise ResourceNotFoundError("No allergy reaction with this id.")
    session.commit()
    return VisitpadAllergyReactionSingleResponse(data=VisitpadAllergyReactionResponse.model_validate(row))

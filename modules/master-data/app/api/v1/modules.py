"""HTTP routes for the module registry (`/modules`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_module_repository, get_session, resolve_actor_id
from app.api.errors import ResourceNotFoundError
from app.core.authz import guard
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import (
    ModuleCategory,
    ModuleCreate,
    ModuleKind,
    ModuleListResponse,
    ModuleNavListResponse,
    ModuleNavResponse,
    ModuleResponse,
    ModuleSingleResponse,
    ModuleUpdate,
    VisibilityScope,
)
from app.services.module_service import (
    create_module,
    get_module_by_id,
    get_module_by_slug,
    list_modules,
    list_modules_for_nav,
    list_submodules,
    soft_delete_module,
    update_module,
)

router = APIRouter(prefix="/modules", tags=["Modules"])

# Global catalog: writes are capability-gated (no tenant equality); reads are identity-gate-only.
_GUARD_CREATE = Depends(guard("master_data:module", "create"))
_GUARD_UPDATE = Depends(guard("master_data:module", "update"))
_GUARD_DELETE = Depends(guard("master_data:module", "delete"))


@router.get("", response_model=ModuleListResponse, summary="List registered platform modules")
def get_modules(
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    category: Annotated[ModuleCategory | None, Query()] = None,
    module_kind: Annotated[str | None, Query(
        description="Filter by module kind(s). Comma-separated: ?module_kind=product,foundation",
    )] = None,
    visibility: Annotated[VisibilityScope | None, Query(
        description=(
            "Filter by visibility scope: 'tenant' (default for tenant admins) "
            "or 'superadmin'. Omit to return all."
        ),
    )] = None,
) -> ModuleListResponse:
    kinds: list[ModuleKind] | None = None
    if module_kind is not None:
        raw = [v.strip() for v in module_kind.split(",") if v.strip()]
        try:
            kinds = [ModuleKind(v) for v in raw]
        except ValueError:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=422, detail=f"Invalid module_kind value(s): {module_kind}"
            ) from None
    modules = list_modules(repository, category=category, module_kinds=kinds, visibility=visibility)
    data = [ModuleResponse.model_validate(module) for module in modules]
    return ModuleListResponse(data=data, total=len(data))


@router.get(
    "/nav",
    response_model=ModuleNavListResponse,
    summary="List modules for shell navigation",
    description=(
        "Returns every **active** catalog module (`is_active = true`, `is_deleted = false`) "
        "with navigation fields only. **No pagination** — full list in one response."
    ),
)
def get_modules_for_nav(
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    visibility: Annotated[VisibilityScope | None, Query(
        description=(
            "Filter by visibility scope. Tenant admins should pass 'tenant'; "
            "superadmins omit to see all."
        ),
    )] = None,
) -> ModuleNavListResponse:
    modules = list_modules_for_nav(repository, visibility=visibility)
    data = [ModuleNavResponse.model_validate(module) for module in modules]
    return ModuleNavListResponse(data=data)


@router.post(
    "",
    response_model=ModuleSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module",
    dependencies=[_GUARD_CREATE],
    description=(
        "Adds one catalog module. Omit **parent_id** for a top-level row. "
        "To nest, set **parent_id** to another module’s id — each step is one level deeper "
        "(parent → child → child, like folders). **level** is not sent; the API fills it."
    ),
)
def post_module(
    payload: ModuleCreate,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> ModuleSingleResponse:
    module = create_module(repository, payload, actor_id=actor_id)
    session.commit()
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.get(
    "/by-slug/{slug}",
    response_model=ModuleSingleResponse,
    summary="Get one module by slug",
)
def get_module_by_slug_route(
    slug: str,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse:
    module = get_module_by_slug(repository, slug)
    if module is None:
        raise ResourceNotFoundError(f"No module with slug '{slug}'.")
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.get(
    "/{module_id}/submodules",
    response_model=ModuleListResponse,
    summary="List direct submodules",
    description=(
        "Every **active** module whose **parent_id** is this id (one tree level below). "
        "Returns the **complete** list in one response (**no pagination**). "
        "**404** if parent missing or soft-deleted; **200** with empty `data` if none."
    ),
)
def list_submodules_route(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleListResponse:
    rows = list_submodules(repository, module_id)
    data = [ModuleResponse.model_validate(m) for m in rows]
    return ModuleListResponse(data=data, total=len(data))


@router.get(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Get one module by id",
)
def get_module_by_id_route(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse:
    module = get_module_by_id(repository, module_id)
    if module is None:
        raise ResourceNotFoundError("No module with this id.")
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.patch(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Update a module",
    dependencies=[_GUARD_UPDATE],
)
def patch_module(
    module_id: UUID,
    payload: ModuleUpdate,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> ModuleSingleResponse:
    module = update_module(repository, module_id, payload, actor_id=actor_id)
    session.commit()
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.delete(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Soft-delete a module",
    dependencies=[_GUARD_DELETE],
)
def delete_module(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    session: Annotated[Session, Depends(get_session)],
    actor_id: Annotated[UUID, Depends(resolve_actor_id)],
) -> ModuleSingleResponse:
    module = soft_delete_module(repository, module_id, actor_id=actor_id)
    session.commit()
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))

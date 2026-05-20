"""HTTP routes for the module registry (`/modules`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_global_module_permission_repository,
    get_global_module_repository,
    get_module_permission_repository,
    get_module_repository,
    get_session,
)
from app.api.errors import ResourceNotFoundError
from app.services.module_service import ModuleNotFoundError
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import (
    ModuleCategory,
    ModuleCreate,
    ModuleListResponse,
    ModuleNavListResponse,
    ModuleNavPermissionLinksListResponse,
    ModuleNavPermissionsBatchListResponse,
    ModuleNavResponse,
    ModuleNavTreeListResponse,
    ModuleResponse,
    ModuleSingleResponse,
    ModuleUpdate,
)
from app.services.module_service import (
    create_module,
    get_module_by_id,
    get_module_by_slug,
    list_modules,
    build_module_nav_tree_with_permissions,
    list_module_nav_permission_links,
    list_module_nav_permissions_batch,
    list_modules_for_nav,
    list_submodules,
    soft_delete_module,
    update_module,
)

router = APIRouter(prefix="/modules", tags=["Modules"])


@router.get("", response_model=ModuleListResponse, summary="List registered platform modules")
def get_modules(
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    category: Annotated[ModuleCategory | None, Query()] = None,
) -> ModuleListResponse:
    modules = list_modules(repository, category=category)
    data = [ModuleResponse.model_validate(module) for module in modules]
    return ModuleListResponse(data=data, total=len(data))


@router.get(
    "/nav",
    summary="List modules for shell navigation",
    description=(
        "Returns every **active** catalog module (`is_active = true`, `is_deleted = false`). "
        "**No pagination** — full list in one response. "
        "Pass **`permissions=true`** for a tree of root modules with children and "
        "``global_master.module_permissions`` links (for role-template editors)."
    ),
)
def get_modules_for_nav(
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    module_permission_repository: Annotated[
        ModulePermissionRepository, Depends(get_module_permission_repository)
    ],
    permissions: Annotated[
        bool,
        Query(
            description=(
                "When true, returns a module tree with ``module_permissions`` per leaf/catalog row."
            ),
        ),
    ] = False,
) -> ModuleNavListResponse | ModuleNavTreeListResponse:
    modules = list_modules_for_nav(repository)
    if permissions:
        permission_rows = module_permission_repository.list_active_module_permissions_with_details()
        data = build_module_nav_tree_with_permissions(modules, permission_rows)
        return ModuleNavTreeListResponse(data=data)
    data = [ModuleNavResponse.model_validate(module) for module in modules]
    return ModuleNavListResponse(data=data)


@router.post(
    "",
    response_model=ModuleSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module",
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
) -> ModuleSingleResponse:
    module = create_module(repository, payload, actor_id=None)
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
    "/permissions",
    response_model=ModuleNavPermissionsBatchListResponse,
    summary="List permission links for many modules",
    description=(
        "Active ``module_permissions`` rows for each requested module from the **platform** "
        "catalog (``global_master``). Pass ``module_ids`` repeatedly. Unknown ids are skipped. "
        "The ``iq_tenant_id`` header is ignored."
    ),
)
def get_modules_nav_permissions_batch(
    module_ids: Annotated[list[UUID], Query(min_length=1, max_length=200)],
    mp_repository: Annotated[
        ModulePermissionRepository,
        Depends(get_global_module_permission_repository),
    ],
    module_repository: Annotated[ModuleRepository, Depends(get_global_module_repository)],
) -> ModuleNavPermissionsBatchListResponse:
    data = list_module_nav_permissions_batch(
        mp_repository, module_repository, module_ids
    )
    return ModuleNavPermissionsBatchListResponse(data=data)


@router.get(
    "/{module_id}/permissions",
    response_model=ModuleNavPermissionLinksListResponse,
    summary="List permission links for one module",
    description=(
        "Active ``module_permissions`` rows for the module from the **platform** catalog "
        "(``global_master``). The ``iq_tenant_id`` header is ignored."
    ),
)
def get_module_nav_permissions(
    module_id: UUID,
    mp_repository: Annotated[
        ModulePermissionRepository,
        Depends(get_global_module_permission_repository),
    ],
    module_repository: Annotated[ModuleRepository, Depends(get_global_module_repository)],
) -> ModuleNavPermissionLinksListResponse:
    try:
        module_row, links = list_module_nav_permission_links(
            mp_repository, module_repository, module_id
        )
    except ModuleNotFoundError as exc:
        raise ResourceNotFoundError("No module with this id.") from exc
    return ModuleNavPermissionLinksListResponse(
        module=ModuleNavResponse.model_validate(module_row),
        data=links,
    )


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
)
def patch_module(
    module_id: UUID,
    payload: ModuleUpdate,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> ModuleSingleResponse:
    module = update_module(repository, module_id, payload, actor_id=None)
    session.commit()
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.delete(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Soft-delete a module",
)
def delete_module(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    session: Annotated[Session, Depends(get_session)],
) -> ModuleSingleResponse:
    module = soft_delete_module(repository, module_id, actor_id=None)
    session.commit()
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))

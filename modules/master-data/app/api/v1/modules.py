"""HTTP routes for the module registry (`/modules`)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import get_module_repository
from app.api.errors import error_payload
from app.repositories.module_repository import DuplicateModuleKeyError, ModuleRepository
from app.schemas.module import (
    ModuleCategory,
    ModuleCreate,
    ModuleListResponse,
    ModuleResponse,
    ModuleSingleResponse,
    ModuleUpdate,
)
from app.services.module_service import (
    InvalidParentCycleError,
    MaxTreeDepthError,
    ModuleNotFoundError,
    ParentModuleNotFoundError,
    create_module,
    get_module_by_id,
    get_module_by_slug,
    list_modules,
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


@router.post(
    "",
    response_model=ModuleSingleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module",
    description=(
        "Registers a catalog row. **Depth (`level`)** is not read from the body: "
        "no `parent_id` → root at **1**. With `parent_id` → **parent.level + 1** "
        "(e.g. **2**, **3**, **4**). Max depth **4**; no child under a level-4 node."
    ),
)
def post_module(
    payload: ModuleCreate,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse | JSONResponse:
    try:
        module = create_module(repository, payload, actor_id=None)
    except DuplicateModuleKeyError:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_payload(
                "CONFLICT",
                "Another active module already uses this name or slug.",
            ),
        )
    except ParentModuleNotFoundError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_payload(
                "BAD_REQUEST",
                "parent_id must reference an existing non-deleted module.",
            ),
        )
    except MaxTreeDepthError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_payload(
                "BAD_REQUEST",
                "Cannot add a child under a module at tree depth 4.",
            ),
        )
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.get(
    "/by-slug/{slug}",
    response_model=ModuleSingleResponse,
    summary="Get one module by slug",
)
def get_module_by_slug_route(
    slug: str,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse | JSONResponse:
    module = get_module_by_slug(repository, slug)
    if module is None:
        return JSONResponse(
            status_code=404,
            content=error_payload(
                "NOT_FOUND",
                f"No module with slug '{slug}'.",
            ),
        )
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.get(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Get one module by id",
)
def get_module_by_id_route(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse | JSONResponse:
    module = get_module_by_id(repository, module_id)
    if module is None:
        return JSONResponse(
            status_code=404,
            content=error_payload(
                "NOT_FOUND",
                "No module with this id.",
            ),
        )
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
) -> ModuleSingleResponse | JSONResponse:
    try:
        module = update_module(repository, module_id, payload, actor_id=None)
    except DuplicateModuleKeyError:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_payload(
                "CONFLICT",
                "Another active module already uses this name or slug.",
            ),
        )
    except ModuleNotFoundError:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No module with this id."),
        )
    except ParentModuleNotFoundError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_payload(
                "BAD_REQUEST",
                "parent_id must reference an existing non-deleted module.",
            ),
        )
    except MaxTreeDepthError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_payload(
                "BAD_REQUEST",
                "Cannot attach under a module at tree depth 4.",
            ),
        )
    except InvalidParentCycleError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_payload(
                "BAD_REQUEST",
                "That parent_id would create a cycle in the module tree.",
            ),
        )
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))


@router.delete(
    "/{module_id}",
    response_model=ModuleSingleResponse,
    summary="Soft-delete a module",
)
def delete_module(
    module_id: UUID,
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
) -> ModuleSingleResponse | JSONResponse:
    try:
        module = soft_delete_module(repository, module_id, actor_id=None)
    except ModuleNotFoundError:
        return JSONResponse(
            status_code=404,
            content=error_payload("NOT_FOUND", "No module with this id."),
        )
    return ModuleSingleResponse(data=ModuleResponse.model_validate(module))

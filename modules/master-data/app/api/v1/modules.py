from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_module_repository
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCategory, ModuleListResponse, ModuleResponse
from app.services.module_service import list_modules

router = APIRouter(prefix="/modules", tags=["Modules"])


@router.get("", response_model=ModuleListResponse, summary="List registered platform modules")
def get_modules(
    repository: Annotated[ModuleRepository, Depends(get_module_repository)],
    category: Annotated[ModuleCategory | None, Query()] = None,
    is_core: Annotated[bool | None, Query()] = None,
) -> ModuleListResponse:
    modules = list_modules(repository, category=category, is_core=is_core)
    data = [ModuleResponse.model_validate(module) for module in modules]
    return ModuleListResponse(data=data, total=len(data))

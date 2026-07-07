"""Internal (service-to-service) routes for the module catalog.

Consumed S2S — e.g. Configurator entitlement hydration — with NO end-user token: the identity
gate skips these paths (see ``app.main`` ``public_path_prefixes``) and they self-gate on a shared
secret (``x-master-data-internal-key``). ``GET /internal/modules`` returns the WHOLE global module
catalog with each row's ``is_deleted`` flag, so a consumer can drop orphaned / soft-deleted module
ids from its own tenant enablement.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_global_module_repository
from app.api.internal_auth import require_internal_api_key
from app.repositories.module_repository import ModuleRepository
from app.schemas.module import ModuleCatalogEntry, ModuleCatalogResponse
from app.services.module_service import list_module_catalog_ids

router = APIRouter(prefix="/internal", tags=["Internal"])


@router.get(
    "/modules",
    response_model=ModuleCatalogResponse,
    summary="Internal S2S: whole global module-id catalog (id + is_deleted)",
    dependencies=[Depends(require_internal_api_key)],
)
def get_internal_module_catalog(
    repository: Annotated[ModuleRepository, Depends(get_global_module_repository)],
) -> ModuleCatalogResponse:
    rows = list_module_catalog_ids(repository)
    entries = [
        ModuleCatalogEntry(id=module_id, is_deleted=is_deleted) for module_id, is_deleted in rows
    ]
    return ModuleCatalogResponse(data=entries)

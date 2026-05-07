"""Use-cases for module_permissions junction catalog."""

from uuid import UUID

from app.models.module_permission import ModulePermissionModel
from app.repositories.module_permission_repository import ModulePermissionRepository
from app.repositories.module_repository import ModuleRepository
from app.repositories.permission_repository import PermissionRepository
from app.schemas.module_permission import ModulePermissionCreate, ModulePermissionUpdate


class ModulePermissionNotFoundError(Exception):
    """No junction row for id/slug scope."""


class InvalidModulePermissionReferenceError(Exception):
    """module_id or permission_id does not reference an active catalog row."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def _require_active_module(repo: ModuleRepository, module_id: UUID) -> None:
    row = repo.get_module_by_id(module_id)
    if row is None:
        raise InvalidModulePermissionReferenceError(
            "module_id must reference an existing non-deleted module.",
        )


def _require_active_permission(repo: PermissionRepository, permission_id: UUID) -> None:
    row = repo.get_permission_by_id(permission_id)
    if row is None:
        raise InvalidModulePermissionReferenceError(
            "permission_id must reference an existing non-deleted permission.",
        )


def list_module_permissions(
    repository: ModulePermissionRepository,
    *,
    module_id: UUID | None = None,
    permission_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ModulePermissionModel], int]:
    return repository.list_module_permissions(
        module_id=module_id,
        permission_id=permission_id,
        limit=limit,
        offset=offset,
    )


def get_module_permission_by_id(
    repository: ModulePermissionRepository,
    row_id: UUID,
) -> ModulePermissionModel | None:
    return repository.get_module_permission_by_id(row_id)


def get_module_permission_by_slug(
    repository: ModulePermissionRepository,
    slug: str,
) -> ModulePermissionModel | None:
    return repository.get_module_permission_by_slug(slug)


def create_module_permission(
    mp_repository: ModulePermissionRepository,
    module_repository: ModuleRepository,
    permission_repository: PermissionRepository,
    payload: ModulePermissionCreate,
    *,
    actor_id: UUID | None,
) -> ModulePermissionModel:
    _require_active_module(module_repository, payload.module_id)
    _require_active_permission(permission_repository, payload.permission_id)
    row = ModulePermissionModel(
        slug=payload.slug,
        module_id=payload.module_id,
        permission_id=payload.permission_id,
        is_default=payload.is_default,
        is_active=payload.is_active,
        created_by=actor_id,
        updated_by=actor_id,
    )
    return mp_repository.create_module_permission(row)


def update_module_permission(
    mp_repository: ModulePermissionRepository,
    module_repository: ModuleRepository,
    permission_repository: PermissionRepository,
    row_id: UUID,
    payload: ModulePermissionUpdate,
    *,
    actor_id: UUID | None,
) -> ModulePermissionModel:
    row = mp_repository.get_module_permission_by_id(row_id, include_deleted=True)
    if row is None:
        raise ModulePermissionNotFoundError

    data = payload.model_dump(exclude_unset=True)
    if "module_id" in data:
        _require_active_module(module_repository, data["module_id"])
        row.module_id = data["module_id"]
    if "permission_id" in data:
        _require_active_permission(permission_repository, data["permission_id"])
        row.permission_id = data["permission_id"]
    if "slug" in data:
        row.slug = data["slug"]
    if "is_default" in data:
        row.is_default = data["is_default"]
    if "is_active" in data:
        row.is_active = data["is_active"]
    if "is_deleted" in data:
        row.is_deleted = data["is_deleted"]

    row.updated_by = actor_id
    return mp_repository.update_module_permission(row)


def soft_delete_module_permission(
    mp_repository: ModulePermissionRepository,
    row_id: UUID,
    *,
    actor_id: UUID | None,
) -> ModulePermissionModel:
    row = mp_repository.get_module_permission_by_id(row_id, include_deleted=True)
    if row is None:
        raise ModulePermissionNotFoundError
    if row.is_deleted:
        return row
    row.is_deleted = True
    row.updated_by = actor_id
    return mp_repository.update_module_permission(row)

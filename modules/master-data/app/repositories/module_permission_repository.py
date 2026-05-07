"""Database access for module↔permission junction (`public.module_permissions`)."""

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.module_permission import ModulePermissionModel


class DuplicateModulePermissionKeyError(Exception):
    """Violates active unique slug or (module_id, permission_id) index."""


def _is_unique_violation(exc: IntegrityError) -> bool:
    orig = getattr(exc, "orig", None)
    if orig is None:
        return False
    if getattr(orig, "pgcode", None) == "23505":
        return True
    if getattr(orig, "sqlite_errorcode", None) in (1555, 2067):
        return True
    text = str(orig).lower()
    return (
        "unique constraint failed" in text
        or "duplicate key value violates unique constraint" in text
    )


class ModulePermissionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_module_permissions(
        self,
        *,
        module_id: UUID | None = None,
        permission_id: UUID | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[ModulePermissionModel], int]:
        filters = [ModulePermissionModel.is_deleted.is_(False)]
        if module_id is not None:
            filters.append(ModulePermissionModel.module_id == module_id)
        if permission_id is not None:
            filters.append(ModulePermissionModel.permission_id == permission_id)

        total_statement: Select[tuple[int]] = select(func.count()).select_from(
            ModulePermissionModel
        )
        for condition in filters:
            total_statement = total_statement.where(condition)
        total = int(self._session.scalar(total_statement) or 0)

        statement: Select[tuple[ModulePermissionModel]] = (
            select(ModulePermissionModel)
            .where(*filters)
            .order_by(ModulePermissionModel.slug)
            .offset(offset)
            .limit(limit)
        )
        rows = list(self._session.scalars(statement).all())
        return rows, total

    def get_module_permission_by_id(
        self,
        row_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> ModulePermissionModel | None:
        row = self._session.get(ModulePermissionModel, row_id)
        if row is None:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_module_permission_by_slug(self, slug: str) -> ModulePermissionModel | None:
        statement = (
            select(ModulePermissionModel)
            .where(
                ModulePermissionModel.slug == slug,
                ModulePermissionModel.is_deleted.is_(False),
            )
            .limit(1)
        )
        return self._session.scalars(statement).first()

    def create_module_permission(self, row: ModulePermissionModel) -> ModulePermissionModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateModulePermissionKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_module_permission(self, row: ModulePermissionModel) -> ModulePermissionModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateModulePermissionKeyError from exc
            raise
        self._session.refresh(row)
        return row

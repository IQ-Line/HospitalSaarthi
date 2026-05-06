"""Database access for permission catalog (`master_data.permissions`)."""

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.permission import PermissionModel
from app.schemas.permission import PermissionAction


class DuplicatePermissionKeyError(Exception):
    """Violates active unique slug index for permissions."""


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


class PermissionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_permissions(
        self,
        *,
        action: PermissionAction | None = None,
    ) -> list[PermissionModel]:
        statement: Select[tuple[PermissionModel]] = (
            select(PermissionModel)
            .where(PermissionModel.is_deleted.is_(False))
            .order_by(PermissionModel.name)
        )
        if action is not None:
            statement = statement.where(PermissionModel.action == action.value)
        return list(self._session.scalars(statement).all())

    def get_permission_by_id(
        self,
        permission_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> PermissionModel | None:
        row = self._session.get(PermissionModel, permission_id)
        if row is None:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_permission_by_slug(self, slug: str) -> PermissionModel | None:
        statement = (
            select(PermissionModel)
            .where(PermissionModel.slug == slug, PermissionModel.is_deleted.is_(False))
            .limit(1)
        )
        return self._session.scalars(statement).first()

    def create_permission(self, permission: PermissionModel) -> PermissionModel:
        self._session.add(permission)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicatePermissionKeyError from exc
            raise
        self._session.refresh(permission)
        return permission

    def update_permission(self, permission: PermissionModel) -> PermissionModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicatePermissionKeyError from exc
            raise
        self._session.refresh(permission)
        return permission

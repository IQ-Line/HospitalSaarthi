"""Database access for ``permissions`` — ``public`` vs ``tenant_master``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import permission_model
from app.core.catalog_scope import CatalogScope
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
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return permission_model(self._scope)

    def list_permissions(
        self,
        *,
        action: PermissionAction | None = None,
    ) -> list[Any]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.tenant_id == self._scope.tenant_id)
        if action is not None:
            filters.append(M.action == action.value)
        statement: Select[tuple[Any]] = select(M).where(*filters).order_by(M.name)
        return list(self._session.scalars(statement).all())

    def get_permission_by_id(
        self,
        permission_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, permission_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.tenant_id != self._scope.tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_permission_by_slug(self, slug: str) -> Any | None:
        M = self._M()
        filters = [M.slug == slug, M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.tenant_id == self._scope.tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def create_permission(self, permission: Any) -> Any:
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

    def update_permission(self, permission: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicatePermissionKeyError from exc
            raise
        self._session.refresh(permission)
        return permission

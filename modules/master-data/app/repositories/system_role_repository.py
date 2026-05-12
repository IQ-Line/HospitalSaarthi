"""Database access for ``system_roles`` — ``public`` vs ``tenant_master``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import system_role_model
from app.core.catalog_scope import CatalogScope


class DuplicateSystemRoleKeyError(Exception):
    """Violates active unique slug index for system_roles."""


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


class SystemRoleRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return system_role_model(self._scope)

    def list_system_roles(
        self,
        *,
        is_template: bool | None = None,
    ) -> list[Any]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.tenant_id == self._scope.tenant_id)
        if is_template is not None:
            filters.append(M.is_template.is_(is_template))
        statement: Select[tuple[Any]] = select(M).where(*filters).order_by(M.name)
        return list(self._session.scalars(statement).all())

    def get_system_role_by_id(
        self,
        role_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, role_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.tenant_id != self._scope.tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_system_role_by_slug(self, slug: str) -> Any | None:
        M = self._M()
        filters = [M.slug == slug, M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.tenant_id == self._scope.tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def create_system_role(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateSystemRoleKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_system_role(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateSystemRoleKeyError from exc
            raise
        self._session.refresh(row)
        return row

"""Database access for ``module_permissions`` — ``global_master`` vs ``tenant_master``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import module_permission_model, permission_model
from app.core.catalog_scope import CatalogScope
from app.repositories.paged_window import fetch_page_with_window_total


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
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return module_permission_model(self._scope)

    def list_active_module_permissions_with_details(self) -> list[tuple[Any, Any]]:
        """All active junction rows joined to active permission definitions (no pagination)."""
        MP = self._M()
        P = permission_model(self._scope)
        filters = [
            MP.is_deleted.is_(False),
            MP.is_active.is_(True),
            P.is_deleted.is_(False),
            P.is_active.is_(True),
        ]
        if self._scope.is_tenant:
            filters.append(MP.iq_tenant_id == self._scope.iq_tenant_id)
            filters.append(P.iq_tenant_id == self._scope.iq_tenant_id)

        statement: Select[tuple[Any, Any]] = (
            select(MP, P)
            .join(P, MP.permission_id == P.id)
            .where(*filters)
            .order_by(MP.slug)
        )
        return list(self._session.execute(statement).all())

    def list_active_permissions_for_module_with_details(
        self,
        module_id: UUID,
    ) -> list[tuple[Any, Any]]:
        """Active junction rows for one module joined to active permission definitions."""
        MP = self._M()
        P = permission_model(self._scope)
        filters = [
            MP.is_deleted.is_(False),
            MP.is_active.is_(True),
            MP.module_id == module_id,
            P.is_deleted.is_(False),
            P.is_active.is_(True),
        ]
        if self._scope.is_tenant:
            filters.append(MP.iq_tenant_id == self._scope.iq_tenant_id)
            filters.append(P.iq_tenant_id == self._scope.iq_tenant_id)

        statement: Select[tuple[Any, Any]] = (
            select(MP, P)
            .join(P, MP.permission_id == P.id)
            .where(*filters)
            .order_by(P.slug)
        )
        return list(self._session.execute(statement).all())

    def list_active_permissions_for_modules_with_details(
        self,
        module_ids: list[UUID],
    ) -> list[tuple[Any, Any]]:
        """Active junction rows for many modules joined to active permission definitions."""
        if not module_ids:
            return []
        MP = self._M()
        P = permission_model(self._scope)
        filters = [
            MP.is_deleted.is_(False),
            MP.is_active.is_(True),
            MP.module_id.in_(module_ids),
            P.is_deleted.is_(False),
            P.is_active.is_(True),
        ]
        if self._scope.is_tenant:
            filters.append(MP.iq_tenant_id == self._scope.iq_tenant_id)
            filters.append(P.iq_tenant_id == self._scope.iq_tenant_id)

        statement: Select[tuple[Any, Any]] = (
            select(MP, P)
            .join(P, MP.permission_id == P.id)
            .where(*filters)
            .order_by(MP.module_id, P.slug)
        )
        return list(self._session.execute(statement).all())

    def list_module_permissions(
        self,
        *,
        module_id: UUID | None = None,
        permission_id: UUID | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if module_id is not None:
            filters.append(M.module_id == module_id)
        if permission_id is not None:
            filters.append(M.permission_id == permission_id)

        cnt = func.count().over().label("_page_total")
        page_stmt = select(M, cnt).where(*filters).order_by(M.slug).offset(offset).limit(limit)
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(M)
        for condition in filters:
            empty_total_stmt = empty_total_stmt.where(condition)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )

    def get_module_permission_by_id(
        self,
        row_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, row_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_module_permission_by_slug(self, slug: str) -> Any | None:
        M = self._M()
        filters = [M.slug == slug, M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def create_module_permission(self, row: Any) -> Any:
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

    def update_module_permission(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateModulePermissionKeyError from exc
            raise
        self._session.refresh(row)
        return row

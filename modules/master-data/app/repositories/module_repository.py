"""Database access for ``modules`` — ``global_master`` (global) vs ``tenant_master``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import module_model
from app.core.catalog_scope import CatalogScope
from app.schemas.module import ModuleCategory, ModuleKind, VisibilityScope


class DuplicateModuleKeyError(Exception):
    """Violates partial unique index on name or slug among active (non-deleted) rows."""


def _is_unique_violation(exc: IntegrityError) -> bool:
    """Best-effort DB-agnostic unique-constraint detection."""
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


class ModuleRepository:
    """Catalog rows. List/detail omit soft-deleted rows unless explicitly loaded for mutation."""

    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return module_model(self._scope)

    def list_modules(
        self,
        *,
        category: ModuleCategory | None = None,
        module_kinds: list[ModuleKind] | None = None,
        visibility: VisibilityScope | None = None,
    ) -> list[Any]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if category is not None:
            filters.append(M.category == category.value)
        if module_kinds:
            filters.append(M.module_kind.in_([k.value for k in module_kinds]))
        if visibility is not None:
            filters.append(M.visibility_scope == visibility.value)

        statement: Select[tuple[Any]] = select(M).where(*filters).order_by(M.display_order, M.name)
        return list(self._session.scalars(statement).all())

    def list_modules_for_nav(
        self,
        *,
        visibility: VisibilityScope | None = None,
    ) -> list[Any]:
        """Active, non-deleted rows for shell navigation (full list; no pagination)."""
        M = self._M()
        filters = [
            M.is_deleted.is_(False),
            M.is_active.is_(True),
        ]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if visibility is not None:
            filters.append(M.visibility_scope == visibility.value)

        statement: Select[tuple[Any]] = (
            select(M).where(*filters).order_by(M.level, M.display_order, M.name)
        )
        return list(self._session.scalars(statement).all())

    def list_modules_by_parent_id(self, parent_id: UUID) -> list[Any]:
        M = self._M()
        filters = [
            M.parent_id == parent_id,
            M.is_deleted.is_(False),
        ]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        statement = select(M).where(*filters).order_by(M.display_order, M.name)
        return list(self._session.scalars(statement).all())

    def get_module_by_id(
        self,
        module_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        module = self._session.get(M, module_id)
        if module is None:
            return None
        if self._scope.is_tenant and module.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and module.is_deleted:
            return None
        return module

    def get_module_by_slug(self, slug: str) -> Any | None:
        M = self._M()
        filters = [M.slug == slug, M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def create_module(self, module: Any) -> Any:
        self._session.add(module)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateModuleKeyError from exc
            raise
        self._session.refresh(module)
        return module

    def update_module(self, module: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateModuleKeyError from exc
            raise
        self._session.refresh(module)
        return module

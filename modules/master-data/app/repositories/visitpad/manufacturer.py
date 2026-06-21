"""Database access for the Visitpad ``manufacturers`` catalog (``master_global`` vs ``master_tenant``)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.visitpad.table_models import visitpad_manufacturer_model
from app.core.catalog_scope import CatalogScope
from app.repositories.paged_window import fetch_page_with_window_total
from app.repositories.visitpad._list_filters import append_is_active_filter
from app.repositories.visitpad.integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadManufacturerRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return visitpad_manufacturer_model(self._scope)

    def list_manufacturers(
        self,
        *,
        search: str | None,
        is_active: bool | None = None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    M.code.ilike(term),
                    M.display_name.ilike(term),
                    M.short_name.isnot(None) & M.short_name.ilike(term),
                ),
            )
        append_is_active_filter(filters, M, is_active)
        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt)
            .where(*filters)
            .order_by(M.display_order, M.code)
            .offset(offset)
            .limit(limit)
        )
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(M)
        for c in filters:
            empty_total_stmt = empty_total_stmt.where(c)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )

    def list_import_key_strings(self) -> list[str]:
        """Lowercase codes (matches import UI comparison for manufacturers)."""
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        stmt = select(func.lower(M.code)).where(*filters).order_by(func.lower(M.code))
        return [str(c) for (c,) in self._session.execute(stmt).all()]

    def get_by_id(
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

    def create(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active manufacturer already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active manufacturer already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

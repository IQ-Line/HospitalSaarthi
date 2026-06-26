"""Database access for ``inventory_hsn_gst``."""

from __future__ import annotations

from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.catalog.inventory.table_models import inventory_hsn_gst_model
from app.core.catalog_scope import CatalogScope
from app.repositories.inventory._scoped import ScopedInventoryCatalogRepository
from app.repositories.paged_window import fetch_page_with_window_total
from app.repositories.visitpad._list_filters import append_is_active_filter


class InventoryHsnGstRepository(ScopedInventoryCatalogRepository):
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        super().__init__(session, scope)

    def _model(self) -> Any:
        return inventory_hsn_gst_model(self._scope)

    def _duplicate_message(self) -> str:
        return "An active HSN/GST row already exists for this code and effective date."

    def list_rows(
        self,
        *,
        search: str | None,
        is_active: bool | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        M = self._model()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if search:
            term = f"%{search.strip()}%"
            filters.append(M.hsn_code.ilike(term))
        append_is_active_filter(filters, M, is_active)
        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt)
            .where(*filters)
            .order_by(M.hsn_code, M.effective_from.desc())
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

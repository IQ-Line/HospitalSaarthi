"""Database access for ``inventory_store_types``."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.catalog.inventory.table_models import inventory_store_type_model
from app.core.catalog_scope import CatalogScope
from app.repositories.inventory._scoped import ScopedInventoryCatalogRepository
from app.repositories.paged_window import fetch_page_with_window_total
from app.repositories.visitpad._list_filters import append_is_active_filter

_ST_CODE_RE = re.compile(r"^ST-(\d+)$", re.IGNORECASE)


class InventoryStoreTypeRepository(ScopedInventoryCatalogRepository):
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        super().__init__(session, scope)

    def _model(self) -> Any:
        return inventory_store_type_model(self._scope)

    def _duplicate_message(self) -> str:
        return "Another active store type already uses this code or name."

    def generate_next_code(self) -> str:
        M = self._model()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        rows = self._session.scalars(select(M.code).where(*filters)).all()
        max_seq = 0
        for code in rows:
            match = _ST_CODE_RE.match(str(code).strip())
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f"ST-{max_seq + 1:04d}"

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
            filters.append(or_(M.code.ilike(term), M.name.ilike(term)))
        append_is_active_filter(filters, M, is_active)
        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt).where(*filters).order_by(M.code).offset(offset).limit(limit)
        )
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(M)
        for c in filters:
            empty_total_stmt = empty_total_stmt.where(c)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )

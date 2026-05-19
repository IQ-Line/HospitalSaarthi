"""Database access for ``picklist`` in ``global_master`` only."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import picklist_model
from app.core.catalog_scope import CatalogScope


class PicklistRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return picklist_model(self._scope)

    def list_picklists(self) -> list[Any]:
        M = self._M()
        statement: Select[tuple[Any]] = (
            select(M).where(M.is_deleted.is_(False)).order_by(M.name)
        )
        return list(self._session.scalars(statement).all())

    def get_picklist_by_id(
        self,
        picklist_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, picklist_id)
        if row is None:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_picklist_by_slug(self, slug: str) -> Any | None:
        M = self._M()
        statement = (
            select(M).where(M.slug == slug, M.is_deleted.is_(False)).limit(1)
        )
        return self._session.scalars(statement).first()

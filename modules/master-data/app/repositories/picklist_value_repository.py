"""Database access for ``picklist_values`` in ``global_master`` only."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import picklist_value_model
from app.core.catalog_scope import CatalogScope


class DuplicatePicklistValueKeyError(Exception):
    """Violates unique slug or (category_id, value) constraint."""


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


class PicklistValueRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return picklist_value_model(self._scope)

    def list_values_for_picklist(
        self,
        category_id: UUID,
        *,
        is_active: bool | None = None,
    ) -> list[Any]:
        M = self._M()
        filters = [M.category_id == category_id]
        if is_active is not None:
            filters.append(M.is_active.is_(is_active))
        statement: Select[tuple[Any]] = (
            select(M).where(*filters).order_by(M.display_order, M.label)
        )
        return list(self._session.scalars(statement).all())

    def get_value_by_id(
        self,
        value_id: UUID,
        *,
        category_id: UUID | None = None,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, value_id)
        if row is None:
            return None
        if category_id is not None and row.category_id != category_id:
            return None
        return row

    def get_value_by_slug(
        self,
        category_id: UUID,
        slug: str,
    ) -> Any | None:
        M = self._M()
        statement = (
            select(M).where(M.category_id == category_id, M.slug == slug).limit(1)
        )
        return self._session.scalars(statement).first()

    def clear_default_for_category(
        self,
        category_id: UUID,
        *,
        except_id: UUID | None = None,
    ) -> None:
        M = self._M()
        filters = [M.category_id == category_id, M.is_default.is_(True)]
        if except_id is not None:
            filters.append(M.id != except_id)
        stmt = update(M).where(*filters).values(is_default=False)
        self._session.execute(stmt)

    def create_value(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicatePicklistValueKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_value(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicatePicklistValueKeyError from exc
            raise
        self._session.refresh(row)
        return row

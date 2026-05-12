"""Database access for Visitpad ``unit_conversions`` (``public`` vs ``tenant_master``)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.visitpad_table_models import visitpad_unit_conversion_model
from app.core.catalog_scope import CatalogScope
from app.repositories.paged_window import fetch_page_with_window_total


class DuplicateVisitpadUnitConversionKeyError(Exception):
    """Violates partial unique on from/to (global) or tenant-scoped pair."""


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


class VisitpadUnitConversionRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return visitpad_unit_conversion_model(self._scope)

    def list_conversions(
        self,
        *,
        search: str | None,
        from_unit_code: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if from_unit_code is not None:
            filters.append(
                func.lower(M.from_unit_code) == from_unit_code.strip().lower(),
            )
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    M.from_unit_code.ilike(term),
                    M.to_unit_code.ilike(term),
                )
            )

        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt)
            .where(*filters)
            .order_by(
                M.display_order,
                M.from_unit_code,
                M.to_unit_code,
            )
            .offset(offset)
            .limit(limit)
        )
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(M)
        for condition in filters:
            empty_total_stmt = empty_total_stmt.where(condition)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )

    def get_conversion_by_id(
        self,
        conversion_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, conversion_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create_conversion(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitConversionKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_conversion(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitConversionKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def count_active_conversions_referencing_unit_code(
        self,
        *,
        unit_code: str,
    ) -> int:
        M = self._M()
        c = unit_code.strip().lower()
        filters = [
            M.is_deleted.is_(False),
            or_(
                func.lower(M.from_unit_code) == c,
                func.lower(M.to_unit_code) == c,
            ),
        ]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        stmt = select(func.count()).select_from(M).where(*filters)
        return int(self._session.scalar(stmt) or 0)

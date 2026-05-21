"""Database access for the Visitpad ``units`` catalog (``global_master`` vs ``tenant_master``)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.visitpad.table_models import visitpad_unit_model
from app.core.catalog_scope import CatalogScope
from app.repositories.paged_window import fetch_page_with_window_total


class DuplicateVisitpadUnitKeyError(Exception):
    """Violates partial unique on ``code`` (global) or ``(iq_tenant_id, code)`` (tenant)."""


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


class VisitpadUnitRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return visitpad_unit_model(self._scope)

    def list_units(
        self,
        *,
        search: str | None,
        dimension: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if dimension is not None:
            filters.append(M.dimension == dimension)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    M.code.ilike(term),
                    M.display_name.ilike(term),
                )
            )

        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt)
            .where(*filters)
            .order_by(M.display_order, M.code)
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

    def get_unit_by_id(
        self,
        unit_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, unit_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_active_unit_by_code(self, *, code: str) -> Any | None:
        """Match by case-insensitive code; only non-deleted **active** units."""
        M = self._M()
        normalized = code.strip().lower()
        filters = [
            func.lower(M.code) == normalized,
            M.is_deleted.is_(False),
            M.is_active.is_(True),
        ]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def list_import_key_strings(self) -> list[str]:
        """Canonical import keys for the current scope (``code`` as stored)."""
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        stmt = select(M.code).where(*filters).order_by(M.code)
        return [str(c) for (c,) in self._session.execute(stmt).all()]

    def create_unit(self, row: Any) -> Any:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitKeyError from exc
            raise
        self._session.refresh(row)
        return row

    def update_unit(self, row: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitKeyError from exc
            raise
        self._session.refresh(row)
        return row

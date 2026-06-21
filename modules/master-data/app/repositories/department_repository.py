"""Database access for ``departments`` — ``master_global`` vs ``master_tenant``."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.platform_table_models import department_model
from app.core.catalog_scope import CatalogScope
from app.repositories.paged_window import fetch_page_with_window_total
from app.schemas.department import DepartmentType


class DuplicateDepartmentKeyError(Exception):
    """Violates partial unique index on ``code`` among active (non-deleted) rows."""


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


class DepartmentRepository:
    def __init__(self, session: Session, scope: CatalogScope) -> None:
        self._session = session
        self._scope = scope

    @property
    def scope(self) -> CatalogScope:
        return self._scope

    def _M(self) -> Any:
        return department_model(self._scope)

    def list_departments(
        self,
        *,
        search: str | None = None,
        department_type: DepartmentType | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Any], int]:
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        if department_type is not None:
            filters.append(M.type == department_type.value)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    M.name.ilike(term),
                    M.code.ilike(term),
                    M.type.ilike(term),
                )
            )

        cnt = func.count().over().label("_page_total")
        page_stmt = (
            select(M, cnt).where(*filters).order_by(M.name).offset(offset).limit(limit)
        )
        empty_total_stmt: Select[tuple[int]] = select(func.count()).select_from(M)
        for condition in filters:
            empty_total_stmt = empty_total_stmt.where(condition)
        return fetch_page_with_window_total(
            self._session,
            page_stmt=page_stmt,
            empty_total_stmt=empty_total_stmt,
        )

    def get_department_by_id(
        self,
        department_id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Any | None:
        M = self._M()
        row = self._session.get(M, department_id)
        if row is None:
            return None
        if self._scope.is_tenant and row.iq_tenant_id != self._scope.iq_tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def list_import_key_strings(self) -> list[str]:
        """Lowercase codes in the current catalog scope (tenant import UI)."""
        M = self._M()
        filters = [M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        stmt = select(func.lower(M.code)).where(*filters).order_by(func.lower(M.code))
        return [str(c) for (c,) in self._session.execute(stmt).all()]

    def get_department_by_code(self, code: str) -> Any | None:
        M = self._M()
        filters = [M.code == code, M.is_deleted.is_(False)]
        if self._scope.is_tenant:
            filters.append(M.iq_tenant_id == self._scope.iq_tenant_id)
        statement = select(M).where(*filters).limit(1)
        return self._session.scalars(statement).first()

    def create_department(self, department: Any) -> Any:
        self._session.add(department)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateDepartmentKeyError from exc
            raise
        self._session.refresh(department)
        return department

    def update_department(self, department: Any) -> Any:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateDepartmentKeyError from exc
            raise
        self._session.refresh(department)
        return department

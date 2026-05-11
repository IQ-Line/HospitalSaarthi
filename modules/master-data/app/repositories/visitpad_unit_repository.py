"""Database access for the Visitpad ``units`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_unit import VisitpadUnitModel


class DuplicateVisitpadUnitKeyError(Exception):
    """Violates partial unique (tenant_id, code) among active rows."""


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
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_units(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        dimension: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadUnitModel], int]:
        filters = [
            VisitpadUnitModel.tenant_id == tenant_id,
            VisitpadUnitModel.is_deleted.is_(False),
        ]
        if dimension is not None:
            filters.append(VisitpadUnitModel.dimension == dimension)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadUnitModel.code.ilike(term),
                    VisitpadUnitModel.display_label.ilike(term),
                )
            )

        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadUnitModel)
        for condition in filters:
            total_statement = total_statement.where(condition)
        total = int(self._session.scalar(total_statement) or 0)

        statement: Select[tuple[VisitpadUnitModel]] = (
            select(VisitpadUnitModel)
            .where(*filters)
            .order_by(VisitpadUnitModel.display_order, VisitpadUnitModel.code)
            .offset(offset)
            .limit(limit)
        )
        rows = list(self._session.scalars(statement).all())
        return rows, total

    def get_unit_by_id(
        self,
        unit_id: UUID,
        *,
        tenant_id: UUID,
        include_deleted: bool = False,
    ) -> VisitpadUnitModel | None:
        row = self._session.get(VisitpadUnitModel, unit_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def get_active_unit_by_code(self, *, tenant_id: UUID, code: str) -> VisitpadUnitModel | None:
        statement = (
            select(VisitpadUnitModel)
            .where(
                VisitpadUnitModel.tenant_id == tenant_id,
                VisitpadUnitModel.code == code,
                VisitpadUnitModel.is_deleted.is_(False),
            )
            .limit(1)
        )
        return self._session.scalars(statement).first()

    def create_unit(self, row: VisitpadUnitModel) -> VisitpadUnitModel:
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

    def update_unit(self, row: VisitpadUnitModel) -> VisitpadUnitModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitKeyError from exc
            raise
        self._session.refresh(row)
        return row

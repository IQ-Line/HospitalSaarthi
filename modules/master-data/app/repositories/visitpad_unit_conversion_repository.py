"""Database access for the Visitpad ``unit_conversions`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_unit_conversion import VisitpadUnitConversionModel


class DuplicateVisitpadUnitConversionKeyError(Exception):
    """Violates partial unique (tenant_id, from, to) among active rows."""


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
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_conversions(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        from_unit_code: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadUnitConversionModel], int]:
        filters = [
            VisitpadUnitConversionModel.tenant_id == tenant_id,
            VisitpadUnitConversionModel.is_deleted.is_(False),
        ]
        if from_unit_code is not None:
            filters.append(VisitpadUnitConversionModel.from_unit_code == from_unit_code)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadUnitConversionModel.from_unit_code.ilike(term),
                    VisitpadUnitConversionModel.to_unit_code.ilike(term),
                )
            )

        total_statement: Select[tuple[int]] = select(func.count()).select_from(
            VisitpadUnitConversionModel
        )
        for condition in filters:
            total_statement = total_statement.where(condition)
        total = int(self._session.scalar(total_statement) or 0)

        statement: Select[tuple[VisitpadUnitConversionModel]] = (
            select(VisitpadUnitConversionModel)
            .where(*filters)
            .order_by(
                VisitpadUnitConversionModel.display_order,
                VisitpadUnitConversionModel.from_unit_code,
                VisitpadUnitConversionModel.to_unit_code,
            )
            .offset(offset)
            .limit(limit)
        )
        rows = list(self._session.scalars(statement).all())
        return rows, total

    def get_conversion_by_id(
        self,
        conversion_id: UUID,
        *,
        tenant_id: UUID,
        include_deleted: bool = False,
    ) -> VisitpadUnitConversionModel | None:
        row = self._session.get(VisitpadUnitConversionModel, conversion_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create_conversion(self, row: VisitpadUnitConversionModel) -> VisitpadUnitConversionModel:
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

    def update_conversion(self, row: VisitpadUnitConversionModel) -> VisitpadUnitConversionModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if _is_unique_violation(exc):
                raise DuplicateVisitpadUnitConversionKeyError from exc
            raise
        self._session.refresh(row)
        return row

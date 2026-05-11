"""Database access for the Visitpad ``vitals`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_vital import VisitpadVitalModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadVitalRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_vitals(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        category: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadVitalModel], int]:
        filters = [
            VisitpadVitalModel.tenant_id == tenant_id,
            VisitpadVitalModel.is_deleted.is_(False),
        ]
        if category is not None:
            filters.append(VisitpadVitalModel.category == category)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadVitalModel.code.ilike(term),
                    VisitpadVitalModel.name.ilike(term),
                    VisitpadVitalModel.short_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadVitalModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadVitalModel)
            .where(*filters)
            .order_by(VisitpadVitalModel.display_order, VisitpadVitalModel.code)
            .offset(offset)
            .limit(limit)
        )
        return list(self._session.scalars(statement).all()), total

    def get_by_id(
        self,
        row_id: UUID,
        *,
        tenant_id: UUID,
        include_deleted: bool = False,
    ) -> VisitpadVitalModel | None:
        row = self._session.get(VisitpadVitalModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadVitalModel) -> VisitpadVitalModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active vital already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadVitalModel) -> VisitpadVitalModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active vital already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

"""Database access for the Visitpad ``rx_columns`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_rx_column import VisitpadRxColumnModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadRxColumnRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_rx_columns(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        section: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadRxColumnModel], int]:
        filters = [
            VisitpadRxColumnModel.tenant_id == tenant_id,
            VisitpadRxColumnModel.is_deleted.is_(False),
        ]
        if section is not None:
            filters.append(VisitpadRxColumnModel.section == section)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadRxColumnModel.code.ilike(term),
                    VisitpadRxColumnModel.display_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadRxColumnModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadRxColumnModel)
            .where(*filters)
            .order_by(VisitpadRxColumnModel.display_order, VisitpadRxColumnModel.code)
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
    ) -> VisitpadRxColumnModel | None:
        row = self._session.get(VisitpadRxColumnModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadRxColumnModel) -> VisitpadRxColumnModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active Rx column already uses this code in this section.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadRxColumnModel) -> VisitpadRxColumnModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active Rx column already uses this code in this section.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

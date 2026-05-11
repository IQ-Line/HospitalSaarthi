"""Database access for the Visitpad ``procedures`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_procedure import VisitpadProcedureModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadProcedureRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_procedures(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        category: str | None,
        billing_category: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadProcedureModel], int]:
        filters = [
            VisitpadProcedureModel.tenant_id == tenant_id,
            VisitpadProcedureModel.is_deleted.is_(False),
        ]
        if category is not None:
            filters.append(VisitpadProcedureModel.category == category)
        if billing_category is not None:
            filters.append(VisitpadProcedureModel.billing_category == billing_category)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadProcedureModel.cpt_code.ilike(term),
                    VisitpadProcedureModel.display_name.ilike(term),
                    VisitpadProcedureModel.official_descriptor.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadProcedureModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadProcedureModel)
            .where(*filters)
            .order_by(VisitpadProcedureModel.display_order, VisitpadProcedureModel.cpt_code)
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
    ) -> VisitpadProcedureModel | None:
        row = self._session.get(VisitpadProcedureModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadProcedureModel) -> VisitpadProcedureModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active procedure already uses this CPT code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadProcedureModel) -> VisitpadProcedureModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active procedure already uses this CPT code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

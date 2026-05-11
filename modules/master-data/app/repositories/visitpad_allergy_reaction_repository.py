"""Database access for the Visitpad ``allergy_reactions`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_allergy_reaction import VisitpadAllergyReactionModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadAllergyReactionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_reactions(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadAllergyReactionModel], int]:
        filters = [
            VisitpadAllergyReactionModel.tenant_id == tenant_id,
            VisitpadAllergyReactionModel.is_deleted.is_(False),
        ]
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadAllergyReactionModel.code.ilike(term),
                    VisitpadAllergyReactionModel.display_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadAllergyReactionModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadAllergyReactionModel)
            .where(*filters)
            .order_by(VisitpadAllergyReactionModel.display_order, VisitpadAllergyReactionModel.code)
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
    ) -> VisitpadAllergyReactionModel | None:
        row = self._session.get(VisitpadAllergyReactionModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadAllergyReactionModel) -> VisitpadAllergyReactionModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active reaction already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadAllergyReactionModel) -> VisitpadAllergyReactionModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active reaction already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

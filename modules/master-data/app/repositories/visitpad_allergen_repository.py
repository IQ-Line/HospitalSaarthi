"""Database access for the Visitpad ``allergens`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_allergen import VisitpadAllergenModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadAllergenRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_allergens(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        allergen_type: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadAllergenModel], int]:
        filters = [
            VisitpadAllergenModel.tenant_id == tenant_id,
            VisitpadAllergenModel.is_deleted.is_(False),
        ]
        if allergen_type is not None:
            filters.append(VisitpadAllergenModel.allergen_type == allergen_type)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadAllergenModel.code.ilike(term),
                    VisitpadAllergenModel.display_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadAllergenModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadAllergenModel)
            .where(*filters)
            .order_by(VisitpadAllergenModel.display_order, VisitpadAllergenModel.code)
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
    ) -> VisitpadAllergenModel | None:
        row = self._session.get(VisitpadAllergenModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadAllergenModel) -> VisitpadAllergenModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active allergen already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadAllergenModel) -> VisitpadAllergenModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active allergen already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

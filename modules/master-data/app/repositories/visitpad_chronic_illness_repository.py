"""Database access for the Visitpad ``chronic_illnesses`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_chronic_illness import VisitpadChronicIllnessModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadChronicIllnessRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_chronic_illnesses(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        category: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadChronicIllnessModel], int]:
        filters = [
            VisitpadChronicIllnessModel.tenant_id == tenant_id,
            VisitpadChronicIllnessModel.is_deleted.is_(False),
        ]
        if category is not None:
            filters.append(VisitpadChronicIllnessModel.category == category)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadChronicIllnessModel.icd10_code.ilike(term),
                    VisitpadChronicIllnessModel.display_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadChronicIllnessModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadChronicIllnessModel)
            .where(*filters)
            .order_by(VisitpadChronicIllnessModel.display_order, VisitpadChronicIllnessModel.icd10_code)
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
    ) -> VisitpadChronicIllnessModel | None:
        row = self._session.get(VisitpadChronicIllnessModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadChronicIllnessModel) -> VisitpadChronicIllnessModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active chronic illness already uses this ICD-10 code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadChronicIllnessModel) -> VisitpadChronicIllnessModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active chronic illness already uses this ICD-10 code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

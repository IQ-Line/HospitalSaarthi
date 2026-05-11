"""Database access for the Visitpad ``diagnoses`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_diagnosis import VisitpadDiagnosisModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadDiagnosisRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_diagnoses(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        category: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadDiagnosisModel], int]:
        filters = [
            VisitpadDiagnosisModel.tenant_id == tenant_id,
            VisitpadDiagnosisModel.is_deleted.is_(False),
        ]
        if category is not None:
            filters.append(VisitpadDiagnosisModel.category == category)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadDiagnosisModel.icd10_code.ilike(term),
                    VisitpadDiagnosisModel.display_name.ilike(term),
                    VisitpadDiagnosisModel.official_descriptor.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadDiagnosisModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadDiagnosisModel)
            .where(*filters)
            .order_by(VisitpadDiagnosisModel.display_order, VisitpadDiagnosisModel.icd10_code)
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
    ) -> VisitpadDiagnosisModel | None:
        row = self._session.get(VisitpadDiagnosisModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadDiagnosisModel) -> VisitpadDiagnosisModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active diagnosis already uses this ICD-10 code and version.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadDiagnosisModel) -> VisitpadDiagnosisModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active diagnosis already uses this ICD-10 code and version.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

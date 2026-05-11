"""Database access for the Visitpad ``chief_complaints`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_chief_complaint import VisitpadChiefComplaintModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadChiefComplaintRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_chief_complaints(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        body_system: str | None,
        triage_priority: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadChiefComplaintModel], int]:
        filters = [
            VisitpadChiefComplaintModel.tenant_id == tenant_id,
            VisitpadChiefComplaintModel.is_deleted.is_(False),
        ]
        if body_system is not None:
            filters.append(VisitpadChiefComplaintModel.body_system == body_system)
        if triage_priority is not None:
            filters.append(VisitpadChiefComplaintModel.triage_priority == triage_priority)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadChiefComplaintModel.code.ilike(term),
                    VisitpadChiefComplaintModel.display_name.ilike(term),
                    VisitpadChiefComplaintModel.snomed_code.isnot(None)
                    & VisitpadChiefComplaintModel.snomed_code.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadChiefComplaintModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadChiefComplaintModel)
            .where(*filters)
            .order_by(VisitpadChiefComplaintModel.display_order, VisitpadChiefComplaintModel.code)
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
    ) -> VisitpadChiefComplaintModel | None:
        row = self._session.get(VisitpadChiefComplaintModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadChiefComplaintModel) -> VisitpadChiefComplaintModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active chief complaint already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadChiefComplaintModel) -> VisitpadChiefComplaintModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active chief complaint already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

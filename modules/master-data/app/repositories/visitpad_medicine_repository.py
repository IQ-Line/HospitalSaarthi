"""Database access for the Visitpad ``medicines`` catalog table."""

from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.visitpad_medicine import VisitpadMedicineModel
from app.repositories.visitpad_integrity import DuplicateVisitpadCatalogKeyError, is_unique_violation


class VisitpadMedicineRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_medicines(
        self,
        *,
        tenant_id: UUID,
        search: str | None,
        schedule: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[VisitpadMedicineModel], int]:
        filters = [
            VisitpadMedicineModel.tenant_id == tenant_id,
            VisitpadMedicineModel.is_deleted.is_(False),
        ]
        if schedule is not None:
            filters.append(VisitpadMedicineModel.schedule == schedule)
        if search:
            term = f"%{search.strip()}%"
            filters.append(
                or_(
                    VisitpadMedicineModel.code.ilike(term),
                    VisitpadMedicineModel.display_name.ilike(term),
                    VisitpadMedicineModel.generic_name.ilike(term),
                )
            )
        total_statement: Select[tuple[int]] = select(func.count()).select_from(VisitpadMedicineModel)
        for c in filters:
            total_statement = total_statement.where(c)
        total = int(self._session.scalar(total_statement) or 0)
        statement = (
            select(VisitpadMedicineModel)
            .where(*filters)
            .order_by(VisitpadMedicineModel.display_order, VisitpadMedicineModel.code)
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
    ) -> VisitpadMedicineModel | None:
        row = self._session.get(VisitpadMedicineModel, row_id)
        if row is None or row.tenant_id != tenant_id:
            return None
        if not include_deleted and row.is_deleted:
            return None
        return row

    def create(self, row: VisitpadMedicineModel) -> VisitpadMedicineModel:
        self._session.add(row)
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active medicine already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

    def update(self, row: VisitpadMedicineModel) -> VisitpadMedicineModel:
        try:
            self._session.flush()
        except IntegrityError as exc:
            self._session.rollback()
            if is_unique_violation(exc):
                raise DuplicateVisitpadCatalogKeyError(
                    "Another active medicine already uses this code.",
                ) from exc
            raise
        self._session.refresh(row)
        return row

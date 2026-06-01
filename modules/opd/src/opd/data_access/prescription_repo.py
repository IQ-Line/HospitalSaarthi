from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from opd.models.prescription import Prescription
from opd.models.visit import Visit


class PrescriptionRepository:
    def __init__(self, session: Session, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    def list_visits(
        self,
        *,
        patient_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[Visit]:
        stmt = select(Visit).where(Visit.tenant_id == self._tenant_id)
        if patient_id is not None:
            stmt = stmt.where(Visit.patient_id == patient_id)
        if status is not None:
            stmt = stmt.where(Visit.status == status)
        stmt = stmt.order_by(Visit.updated_at.desc()).limit(limit)
        return list(self._session.scalars(stmt).all())

    def get_latest_visit_with_prescription(self, patient_id: UUID) -> tuple[Visit, Prescription] | None:
        stmt = (
            select(Visit)
            .options(joinedload(Visit.prescription))
            .where(Visit.tenant_id == self._tenant_id, Visit.patient_id == patient_id)
            .order_by(Visit.updated_at.desc())
            .limit(1)
        )
        visit = self._session.scalars(stmt).first()
        if visit is None or visit.prescription is None:
            return None
        return visit, visit.prescription

    def get_or_create_active_visit(self, patient_id: UUID) -> tuple[Visit, Prescription]:
        existing = self.get_latest_visit_with_prescription(patient_id)
        if existing is not None:
            visit, rx = existing
            if visit.status in ("in_progress", "registered"):
                return visit, rx

        now = datetime.now(UTC)
        visit = Visit(
            tenant_id=self._tenant_id,
            patient_id=patient_id,
            status="in_progress",
            created_at=now,
            updated_at=now,
        )
        self._session.add(visit)
        self._session.flush()

        rx = Prescription(
            tenant_id=self._tenant_id,
            visit_id=visit.id,
            patient_id=patient_id,
            status="draft",
            form_data={},
            created_at=now,
            updated_at=now,
        )
        self._session.add(rx)
        self._session.flush()
        return visit, rx

    def save_draft(self, patient_id: UUID, form_data: dict[str, Any]) -> tuple[Visit, Prescription]:
        visit, rx = self.get_or_create_active_visit(patient_id)
        if visit.status == "completed":
            visit = Visit(
                tenant_id=self._tenant_id,
                patient_id=patient_id,
                status="in_progress",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            self._session.add(visit)
            self._session.flush()
            rx = Prescription(
                tenant_id=self._tenant_id,
                visit_id=visit.id,
                patient_id=patient_id,
                status="draft",
                form_data=form_data,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            self._session.add(rx)
        else:
            visit.status = "in_progress"
            visit.updated_at = datetime.now(UTC)
            rx.form_data = form_data
            rx.status = "draft"
            rx.updated_at = datetime.now(UTC)
        self._session.flush()
        return visit, rx

    def end_consultation(self, patient_id: UUID, form_data: dict[str, Any]) -> tuple[Visit, Prescription]:
        visit, rx = self.save_draft(patient_id, form_data)
        now = datetime.now(UTC)
        visit.status = "completed"
        visit.updated_at = now
        rx.form_data = form_data
        rx.status = "final"
        rx.finalized_at = now
        rx.updated_at = now
        self._session.flush()
        return visit, rx

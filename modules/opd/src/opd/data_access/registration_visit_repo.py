from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from opd.data_access.prescription_repo import PatientEncounterRow
from opd.models.prescription_row import Prescription
from opd.models.registration_visit import RegistrationVisit


def registration_status_to_opd_visit_status(status: str) -> str:
    """Map registration.visit.status to OPD patients-queue status."""
    if status == "pending":
        return "registered"
    return status


def effective_visit_status(
    registration_status: str,
    prescription_status: str | None,
) -> str:
    """Queue status: registration.visit plus OPD prescription overlay."""
    if prescription_status == "final":
        return "completed"
    if prescription_status == "cancelled":
        return "cancelled"
    # Front desk marks intake/billing done as registration ``completed``; not doctor consulted.
    if registration_status == "completed":
        return "registered"
    return registration_status_to_opd_visit_status(registration_status)


def opd_status_filter_to_registration(status: str | None) -> str | None:
    """Map OPD list query status to registration.visit.status."""
    if status is None:
        return None
    normalized = status.replace("-", "_")
    if normalized == "registered":
        return "pending"
    if normalized in ("in_progress", "completed", "cancelled", "pending"):
        return normalized
    return normalized


@dataclass(frozen=True)
class RegistrationVisitRepository:
    session: Session
    tenant_id: UUID

    def list_patient_encounters(
        self,
        *,
        status: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[PatientEncounterRow], int]:
        """Latest registration visit per patient for the tenant (OPD patients queue)."""
        stmt = (
            select(RegistrationVisit)
            .where(RegistrationVisit.tenant_id == self.tenant_id)
            .order_by(RegistrationVisit.updated_at.desc())
            .limit(2000)
        )

        visits = list(self.session.scalars(stmt).all())
        latest: dict[UUID, RegistrationVisit] = {}
        for visit in visits:
            existing = latest.get(visit.patient_id)
            if existing is None or visit.updated_at > existing.updated_at:
                latest[visit.patient_id] = visit

        rx_by_visit = self._prescription_by_visit_id()

        rows: list[PatientEncounterRow] = []
        for visit in latest.values():
            rx = rx_by_visit.get(visit.id)
            rx_status = rx.status if rx is not None else None
            opd_status = effective_visit_status(visit.status, rx_status)
            if status is not None:
                normalized = status.replace("-", "_")
                if opd_status != normalized:
                    continue

            rows.append(
                PatientEncounterRow(
                    patient_id=visit.patient_id,
                    visit_id=visit.id,
                    visit_status=opd_status,
                    prescription_status=rx.status if rx is not None else None,
                    updated_at=visit.updated_at,
                    created_at=visit.created_at,
                )
            )

        rows.sort(key=lambda r: r.updated_at, reverse=True)
        total = len(rows)
        offset = max(page - 1, 0) * limit
        return rows[offset : offset + limit], total

    def _prescription_by_visit_id(self) -> dict[UUID, Prescription]:
        stmt = (
            select(Prescription)
            .where(Prescription.tenant_id == self.tenant_id)
            .order_by(Prescription.updated_at.desc())
            .limit(2000)
        )
        by_visit: dict[UUID, Prescription] = {}
        for rx in self.session.scalars(stmt).all():
            if rx.visit_id not in by_visit:
                by_visit[rx.visit_id] = rx
        return by_visit

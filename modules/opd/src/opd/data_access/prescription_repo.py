from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from opd.data_access import prescription_bundle as bundle_api
from opd.data_access.prescription_form_data import persist_normalized_from_form_data
from opd.models.prescription import Prescription
from opd.models.visit import Visit


@dataclass(frozen=True)
class PatientEncounterRow:
    patient_id: UUID
    visit_id: UUID
    visit_status: str
    prescription_status: str | None
    updated_at: datetime
    created_at: datetime


def effective_encounter_status(visit: Visit | None, rx: Prescription | None) -> str:
    """Resolve UI status from visit row and/or prescription row (handles legacy rows)."""
    if visit is not None:
        if visit.status == "completed":
            return "completed"
        if rx is not None and rx.status == "final":
            return "completed"
        if visit.status == "cancelled":
            return "cancelled"
        if visit.status == "pre_consulted":
            return "pre_consulted"
        if visit.status in ("in_progress", "registered"):
            return "in_progress"
        return visit.status
    if rx is not None:
        if rx.status == "final":
            return "completed"
        if rx.status == "cancelled":
            return "cancelled"
        return "in_progress"
    return "registered"


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
        stmt = (
            select(Visit)
            .options(joinedload(Visit.prescription))
            .where(Visit.tenant_id == self._tenant_id)
        )
        if patient_id is not None:
            stmt = stmt.where(Visit.patient_id == patient_id)
        if status is not None:
            stmt = stmt.where(Visit.status == status)
        stmt = stmt.order_by(Visit.updated_at.desc()).limit(limit)
        return list(self._session.scalars(stmt).all())

    def list_patient_encounters(
        self,
        *,
        status: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[PatientEncounterRow], int]:
        """Latest encounter per patient for the tenant (visits + prescriptions)."""
        visits = self.list_visits(limit=1000)
        latest: dict[UUID, PatientEncounterRow] = {}

        for visit in visits:
            rx = visit.prescription
            row = PatientEncounterRow(
                patient_id=visit.patient_id,
                visit_id=visit.id,
                visit_status=effective_encounter_status(visit, rx),
                prescription_status=rx.status if rx is not None else None,
                updated_at=visit.updated_at,
                created_at=visit.created_at,
            )
            existing = latest.get(visit.patient_id)
            if existing is None or row.updated_at > existing.updated_at:
                latest[visit.patient_id] = row

        rx_stmt = (
            select(Prescription)
            .where(Prescription.tenant_id == self._tenant_id)
            .order_by(Prescription.updated_at.desc())
            .limit(1000)
        )
        for rx in self._session.scalars(rx_stmt).all():
            visit = self._session.get(Visit, rx.visit_id)
            if visit is not None and visit.tenant_id != self._tenant_id:
                continue
            updated = rx.updated_at or rx.created_at
            created = rx.created_at or updated
            row = PatientEncounterRow(
                patient_id=rx.patient_id,
                visit_id=rx.visit_id,
                visit_status=effective_encounter_status(visit, rx),
                prescription_status=rx.status,
                updated_at=updated,
                created_at=created,
            )
            existing = latest.get(rx.patient_id)
            if existing is None or row.updated_at >= existing.updated_at:
                latest[rx.patient_id] = row

        rows = list(latest.values())
        if status is not None:
            normalized = status.replace("-", "_")
            rows = [r for r in rows if r.visit_status == normalized]

        rows.sort(key=lambda r: r.updated_at, reverse=True)
        total = len(rows)
        offset = max(page - 1, 0) * limit
        return rows[offset : offset + limit], total

    def get_visit_with_prescription(self, visit_id: UUID) -> bundle_api.PrescriptionBundle | None:
        return bundle_api.get_prescription_by_visit_id(self._session, self._tenant_id, visit_id)

    def get_prescription_by_id(self, prescription_id: UUID) -> bundle_api.PrescriptionBundle | None:
        return bundle_api.get_prescription_by_id(self._session, self._tenant_id, prescription_id)

    def get_latest_prescription(self, patient_id: UUID) -> bundle_api.PrescriptionBundle | None:
        return bundle_api.get_latest_prescription_for_patient(
            self._session,
            self._tenant_id,
            patient_id,
        )

    def get_latest_visit_with_prescription(self, patient_id: UUID) -> bundle_api.PrescriptionBundle | None:
        return self.get_latest_prescription(patient_id)

    def _resolve_doctor_id_for_visit(
        self,
        visit_id: UUID,
        doctor_id: UUID | None,
    ) -> UUID:
        if doctor_id is not None:
            return doctor_id
        from opd.models.registration_visit import RegistrationVisit

        reg = self._session.get(RegistrationVisit, (visit_id, self._tenant_id))
        if reg is not None and reg.doctor_id is not None:
            return reg.doctor_id
        raise ValueError("doctor_id is required to create a prescription")

    def ensure_registration_encounter(
        self,
        visit_id: UUID,
        patient_id: UUID,
        *,
        doctor_id: UUID | None = None,
    ) -> tuple[Visit, Prescription]:
        """Idempotent OPD visit + draft prescription for a registration.visit id."""
        resolved_doctor_id = self._resolve_doctor_id_for_visit(visit_id, doctor_id)
        now = datetime.now(UTC)
        visit = self._session.get(Visit, visit_id)
        if visit is None:
            visit = Visit(
                id=visit_id,
                tenant_id=self._tenant_id,
                patient_id=patient_id,
                status="registered",
                created_at=now,
                updated_at=now,
            )
            self._session.add(visit)
            self._session.flush()
        else:
            if visit.tenant_id != self._tenant_id:
                raise PermissionError("visit tenant mismatch")
            if visit.patient_id != patient_id:
                raise ValueError("visit patient mismatch")
            if visit.status not in ("completed", "cancelled"):
                visit.status = "registered"
                visit.updated_at = now
                self._session.flush()

        stmt = select(Prescription).where(
            Prescription.tenant_id == self._tenant_id,
            Prescription.visit_id == visit_id,
        )
        rx = self._session.scalars(stmt).first()
        if rx is not None:
            return visit, rx

        rx = Prescription(
            tenant_id=self._tenant_id,
            visit_id=visit_id,
            patient_id=patient_id,
            doctor_id=resolved_doctor_id,
            status="draft",
            form_data={},
            created_at=now,
            updated_at=now,
        )
        self._session.add(rx)
        self._session.flush()
        return visit, rx

    def _get_or_create_prescription_for_visit(
        self,
        visit_id: UUID,
        patient_id: UUID,
    ) -> tuple[Visit, Prescription]:
        visit = self._session.get(Visit, visit_id)
        if visit is None or visit.tenant_id != self._tenant_id:
            raise LookupError("visit not found")
        if visit.patient_id != patient_id:
            raise ValueError("visit patient mismatch")

        stmt = select(Prescription).where(
            Prescription.tenant_id == self._tenant_id,
            Prescription.visit_id == visit_id,
        )
        rx = self._session.scalars(stmt).first()
        if rx is not None:
            return visit, rx

        resolved_doctor_id = self._resolve_doctor_id_for_visit(visit_id, None)
        now = datetime.now(UTC)
        rx = Prescription(
            tenant_id=self._tenant_id,
            visit_id=visit_id,
            patient_id=patient_id,
            doctor_id=resolved_doctor_id,
            status="draft",
            form_data={},
            created_at=now,
            updated_at=now,
        )
        self._session.add(rx)
        self._session.flush()
        return visit, rx

    def _doctor_id_for_patient(self, patient_id: UUID) -> UUID | None:
        from opd.models.registration_visit import RegistrationVisit

        stmt = (
            select(RegistrationVisit)
            .where(
                RegistrationVisit.tenant_id == self._tenant_id,
                RegistrationVisit.patient_id == patient_id,
                RegistrationVisit.doctor_id.isnot(None),
            )
            .order_by(RegistrationVisit.updated_at.desc())
            .limit(1)
        )
        reg = self._session.scalars(stmt).first()
        return reg.doctor_id if reg is not None else None

    def save_nurse_pre_consult_for_visit(
        self,
        visit_id: UUID,
        patient_id: UUID,
        form_data: dict[str, Any],
    ) -> tuple[Visit, Prescription]:
        """Persist nurse vitals / pre-consult data and mark visit ready for doctor."""
        visit, rx = self._get_or_create_prescription_for_visit(visit_id, patient_id)
        if rx.status in ("final", "cancelled") or visit.status == "completed":
            raise PermissionError("prescription is read-only")

        now = datetime.now(UTC)
        visit.status = "pre_consulted"
        visit.updated_at = now
        rx.form_data = form_data
        rx.status = "draft"
        rx.updated_at = now
        self._session.flush()
        persist_normalized_from_form_data(self._session, self._tenant_id, rx.id, form_data)
        self._session.flush()
        return visit, rx

    def save_draft_for_visit(
        self,
        visit_id: UUID,
        patient_id: UUID,
        form_data: dict[str, Any],
    ) -> tuple[Visit, Prescription]:
        visit, rx = self._get_or_create_prescription_for_visit(visit_id, patient_id)
        if rx.status in ("final", "cancelled") or visit.status == "completed":
            raise PermissionError("prescription is read-only")

        now = datetime.now(UTC)
        visit.status = "in_progress"
        visit.updated_at = now
        rx.form_data = form_data
        rx.status = "draft"
        rx.updated_at = now
        self._session.flush()
        persist_normalized_from_form_data(self._session, self._tenant_id, rx.id, form_data)
        self._session.flush()
        return visit, rx

    def end_consultation_for_visit(
        self,
        visit_id: UUID,
        patient_id: UUID,
        form_data: dict[str, Any],
    ) -> tuple[Visit, Prescription]:
        visit, rx = self.save_draft_for_visit(visit_id, patient_id, form_data)
        now = datetime.now(UTC)
        visit.status = "completed"
        visit.updated_at = now
        rx.form_data = form_data
        rx.status = "final"
        rx.finalized_at = now
        rx.updated_at = now
        self._session.flush()
        persist_normalized_from_form_data(self._session, self._tenant_id, rx.id, form_data)
        self._session.flush()
        return visit, rx

    def get_or_create_active_visit(self, patient_id: UUID) -> tuple[Visit, Prescription]:
        existing = self.get_latest_prescription(patient_id)
        if existing is not None:
            visit = bundle_api.ensure_visit_for_bundle(self._session, existing)
            rx = existing.rx
            if visit.status in ("in_progress", "registered") and rx.status == "draft":
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

        doctor_id = self._doctor_id_for_patient(patient_id)
        if doctor_id is None:
            raise ValueError("doctor_id is required to create a prescription")

        rx = Prescription(
            tenant_id=self._tenant_id,
            visit_id=visit.id,
            patient_id=patient_id,
            doctor_id=doctor_id,
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
            doctor_id = self._doctor_id_for_patient(patient_id)
            if doctor_id is None:
                raise ValueError("doctor_id is required to create a prescription")
            rx = Prescription(
                tenant_id=self._tenant_id,
                visit_id=visit.id,
                patient_id=patient_id,
                doctor_id=doctor_id,
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
        persist_normalized_from_form_data(self._session, self._tenant_id, rx.id, form_data)
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
        persist_normalized_from_form_data(self._session, self._tenant_id, rx.id, form_data)
        self._session.flush()
        return visit, rx

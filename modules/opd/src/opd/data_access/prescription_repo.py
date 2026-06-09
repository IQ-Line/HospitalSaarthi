from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from dataclasses import dataclass

from sqlalchemy import JSON, DateTime, String, Uuid, cast, exists, func, literal, select, union_all
from sqlalchemy.orm import Session

from opd.data_access import prescription_bundle as bundle_api
from opd.data_access.prescription_form_data import persist_normalized_from_form_data
from opd.models.prescription_row import Prescription
from opd.models.visit import Visit


@dataclass(frozen=True)
class PatientEncounterRow:
    patient_id: UUID
    visit_id: UUID
    visit_status: str
    prescription_status: str | None
    updated_at: datetime
    created_at: datetime


@dataclass(frozen=True)
class CompletedVisitRow:
    visit_id: UUID
    patient_id: UUID
    prescription_id: UUID | None
    doctor_id: UUID | None
    visit_status: str
    prescription_status: str | None
    updated_at: datetime
    finalized_at: datetime | None
    medicine_count: int


def _medicine_count_from_form_data(form_data: dict[str, Any] | None) -> int:
    if not isinstance(form_data, dict):
        return 0
    medicines = form_data.get("medicines")
    if not isinstance(medicines, list):
        return 0
    return len(medicines)


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
    def __init__(
        self,
        session: Session,
        tenant_id: UUID,
        doctor_id: UUID | None = None,
    ) -> None:
        self._session = session
        self._tenant_id = tenant_id
        self._doctor_id = doctor_id

    def _new_prescription(
        self,
        *,
        visit_id: UUID,
        patient_id: UUID,
        form_data: dict[str, Any] | None = None,
        status: str = "draft",
    ) -> Prescription:
        if self._doctor_id is None:
            raise ValueError("doctor_id is required to create prescriptions")
        now = datetime.now(UTC)
        return Prescription(
            tenant_id=self._tenant_id,
            visit_id=visit_id,
            patient_id=patient_id,
            doctor_id=self._doctor_id,
            vitals_schema_version=1,
            status=status,
            form_data=form_data if form_data is not None else {},
            created_at=now,
            updated_at=now,
        )

    def _prescriptions_by_visit_id(self, visit_ids: list[UUID]) -> dict[UUID, Prescription]:
        if not visit_ids:
            return {}
        stmt = select(Prescription).where(
            Prescription.tenant_id == self._tenant_id,
            Prescription.visit_id.in_(visit_ids),
        )
        return {rx.visit_id: rx for rx in self._session.scalars(stmt).all()}

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

    def _visit_date_filters(
        self,
        *,
        queued_from: date | None,
        queued_to: date | None,
        column,
    ) -> list[Any]:
        filters: list[Any] = []
        if queued_from is not None:
            start = datetime.combine(queued_from, datetime.min.time(), tzinfo=UTC)
            filters.append(column >= start)
        if queued_to is not None:
            end_exclusive = datetime.combine(
                queued_to + timedelta(days=1),
                datetime.min.time(),
                tzinfo=UTC,
            )
            filters.append(column < end_exclusive)
        return filters

    def _completed_visit_queue_union(
        self,
        *,
        queued_from: date | None = None,
        queued_to: date | None = None,
    ):
        from opd.models.registration_visit import RegistrationVisit

        rx_filters = [
            Visit.tenant_id == self._tenant_id,
            Prescription.tenant_id == self._tenant_id,
            Visit.status != "cancelled",
            Prescription.status != "cancelled",
            *self._visit_date_filters(
                queued_from=queued_from,
                queued_to=queued_to,
                column=Visit.updated_at,
            ),
        ]

        rx_part = (
            select(
                Visit.id.label("visit_id"),
                Visit.patient_id.label("patient_id"),
                Prescription.id.label("prescription_id"),
                Prescription.doctor_id.label("doctor_id"),
                Visit.status.label("visit_status_raw"),
                Prescription.status.label("prescription_status"),
                Visit.updated_at.label("updated_at"),
                Prescription.finalized_at.label("finalized_at"),
                Prescription.form_data.label("form_data"),
                literal("with_prescription").label("row_kind"),
            )
            .join(Prescription, Prescription.visit_id == Visit.id)
            .where(*rx_filters)
        )

        reg_filters = [
            RegistrationVisit.tenant_id == self._tenant_id,
            RegistrationVisit.status != "cancelled",
            *self._visit_date_filters(
                queued_from=queued_from,
                queued_to=queued_to,
                column=RegistrationVisit.updated_at,
            ),
            ~exists(
                select(literal(1)).where(
                    Prescription.tenant_id == self._tenant_id,
                    Prescription.visit_id == RegistrationVisit.id,
                ),
            ),
        ]

        null_uuid = cast(literal(None), Uuid(as_uuid=True))
        null_ts = cast(literal(None), DateTime(timezone=True))
        null_json = cast(literal(None), JSON())
        null_status = cast(literal(None), String())

        reg_part = select(
            RegistrationVisit.id.label("visit_id"),
            RegistrationVisit.patient_id.label("patient_id"),
            null_uuid.label("prescription_id"),
            RegistrationVisit.doctor_id.label("doctor_id"),
            RegistrationVisit.status.label("visit_status_raw"),
            null_status.label("prescription_status"),
            RegistrationVisit.updated_at.label("updated_at"),
            null_ts.label("finalized_at"),
            null_json.label("form_data"),
            literal("registration_only").label("row_kind"),
        ).where(*reg_filters)

        return union_all(rx_part, reg_part).subquery("completed_visit_queue")

    def _map_completed_visit_queue_row(self, row: Any) -> CompletedVisitRow:
        form_data = row.form_data if isinstance(row.form_data, dict) else None
        if row.row_kind == "with_prescription":
            return CompletedVisitRow(
                visit_id=row.visit_id,
                patient_id=row.patient_id,
                prescription_id=row.prescription_id,
                doctor_id=row.doctor_id,
                visit_status=row.visit_status_raw,
                prescription_status=row.prescription_status,
                updated_at=row.updated_at,
                finalized_at=row.finalized_at,
                medicine_count=_medicine_count_from_form_data(form_data),
            )

        from opd.data_access.registration_visit_repo import effective_visit_status

        return CompletedVisitRow(
            visit_id=row.visit_id,
            patient_id=row.patient_id,
            prescription_id=None,
            doctor_id=row.doctor_id,
            visit_status=effective_visit_status(row.visit_status_raw, None),
            prescription_status=None,
            updated_at=row.updated_at,
            finalized_at=None,
            medicine_count=0,
        )

    def list_completed_visits(
        self,
        *,
        page: int = 1,
        limit: int = 50,
        queued_from: date | None = None,
        queued_to: date | None = None,
    ) -> tuple[list[CompletedVisitRow], int]:
        """Paginated pharmacy queue visits — OPD Rx rows plus registered intake without Rx."""
        queue = self._completed_visit_queue_union(
            queued_from=queued_from,
            queued_to=queued_to,
        )
        total = self._session.scalar(select(func.count()).select_from(queue)) or 0
        offset = max(page - 1, 0) * limit
        page_stmt = (
            select(queue)
            .order_by(queue.c.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        rows = [
            self._map_completed_visit_queue_row(row)
            for row in self._session.execute(page_stmt).all()
        ]
        return rows, total

    def list_patient_encounters(
        self,
        *,
        status: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[PatientEncounterRow], int]:
        """Latest encounter per patient for the tenant (visits + prescriptions)."""
        visits = self.list_visits(limit=1000)
        rx_by_visit_id = self._prescriptions_by_visit_id([v.id for v in visits])
        latest: dict[UUID, PatientEncounterRow] = {}

        for visit in visits:
            rx = rx_by_visit_id.get(visit.id)
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

        reg = self._session.get(RegistrationVisit, (self._tenant_id, visit_id))
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

    def finalize_prescription_for_visit(
        self,
        visit_id: UUID,
        patient_id: UUID,
        form_data: dict[str, Any],
    ) -> tuple[Visit, Prescription]:
        """Persist final prescription for a registration encounter id (OPD visit id = registration visit id)."""
        visit = self._session.get(Visit, visit_id)
        if visit is None:
            visit, rx = self.ensure_registration_encounter(visit_id, patient_id)
        else:
            if visit.tenant_id != self._tenant_id:
                raise PermissionError("visit tenant mismatch")
            if visit.patient_id != patient_id:
                raise ValueError("visit patient mismatch")
            visit, rx = self._get_or_create_prescription_for_visit(visit_id, patient_id)

        if rx.status in ("final", "cancelled"):
            raise PermissionError("prescription is read-only")

        now = datetime.now(UTC)
        if visit.status not in ("completed", "cancelled"):
            visit.status = "in_progress"
            visit.updated_at = now
        rx.form_data = form_data
        rx.status = "final"
        rx.finalized_at = now
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
        visit, rx = self.finalize_prescription_for_visit(visit_id, patient_id, form_data)
        now = datetime.now(UTC)
        visit.status = "completed"
        visit.updated_at = now
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

        rx = self._new_prescription(visit_id=visit.id, patient_id=patient_id)
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
            rx = self._new_prescription(
                visit_id=visit.id,
                patient_id=patient_id,
                form_data=form_data,
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

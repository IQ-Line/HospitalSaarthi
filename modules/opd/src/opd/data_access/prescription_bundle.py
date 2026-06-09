from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from opd.data_access.visit_status import effective_encounter_status
from opd.models.prescription_row import Prescription
from opd.models.visit import Visit


@dataclass(frozen=True)
class PrescriptionBundle:
    rx: Prescription
    visit: Visit | None

    @property
    def visit_id(self) -> UUID:
        return self.rx.visit_id

    @property
    def patient_id(self) -> UUID:
        return self.rx.patient_id

    @property
    def visit_status(self) -> str:
        return effective_encounter_status(self.visit, self.rx)

    @property
    def is_read_only(self) -> bool:
        if self.rx.status == "final":
            return True
        if self.visit is not None and self.visit.status == "completed":
            return True
        return False


def _ensure_visit_row(session: Session, rx: Prescription) -> Visit:
    visit = session.get(Visit, rx.visit_id)
    if visit is not None:
        return visit

    now = datetime.now(UTC)
    status = effective_encounter_status(None, rx)
    if status == "in_progress":
        visit_status = "in_progress"
    elif status == "completed":
        visit_status = "completed"
    elif status == "cancelled":
        visit_status = "cancelled"
    else:
        visit_status = "registered"

    visit = Visit(
        id=rx.visit_id,
        tenant_id=rx.tenant_id,
        patient_id=rx.patient_id,
        status=visit_status,
        created_at=rx.created_at or now,
        updated_at=rx.updated_at or now,
    )
    session.add(visit)
    session.flush()
    return visit


def bundle_from_prescription(session: Session, tenant_id: UUID, rx: Prescription) -> PrescriptionBundle:
    if rx.tenant_id != tenant_id:
        raise ValueError("prescription tenant mismatch")

    visit = session.get(Visit, rx.visit_id)
    if visit is not None and visit.tenant_id != tenant_id:
        visit = None
    return PrescriptionBundle(rx=rx, visit=visit)


def get_prescription_by_id(
    session: Session,
    tenant_id: UUID,
    prescription_id: UUID,
) -> PrescriptionBundle | None:
    rx = session.get(Prescription, prescription_id)
    if rx is None or rx.tenant_id != tenant_id:
        return None
    return bundle_from_prescription(session, tenant_id, rx)


def get_prescription_by_visit_id(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> PrescriptionBundle | None:
    stmt = select(Prescription).where(
        Prescription.tenant_id == tenant_id,
        Prescription.visit_id == visit_id,
    )
    rx = session.scalars(stmt).first()
    if rx is None:
        return None
    return bundle_from_prescription(session, tenant_id, rx)


def get_latest_prescription_for_patient(
    session: Session,
    tenant_id: UUID,
    patient_id: UUID,
) -> PrescriptionBundle | None:
    stmt = (
        select(Prescription)
        .where(Prescription.tenant_id == tenant_id, Prescription.patient_id == patient_id)
        .order_by(Prescription.updated_at.desc())
        .limit(1)
    )
    rx = session.scalars(stmt).first()
    if rx is None:
        return None
    return bundle_from_prescription(session, tenant_id, rx)


def ensure_visit_for_bundle(session: Session, bundle: PrescriptionBundle) -> Visit:
    if bundle.visit is not None:
        return bundle.visit
    return _ensure_visit_row(session, bundle.rx)

"""OPD visit queue status resolution (visit row + prescription status)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from opd.models.prescription_row import Prescription
from opd.models.visit import Visit


def effective_encounter_status(
    visit: Visit | None,
    rx: Prescription | None = None,
    *,
    prescription_status: str | None = None,
) -> str:
    """Resolve UI status from visit row and/or prescription status (handles legacy rows)."""
    rx_status = (
        prescription_status
        if prescription_status is not None
        else (rx.status if rx is not None else None)
    )
    if visit is not None:
        if visit.status == "completed":
            return "completed"
        if rx_status == "final":
            return "completed"
        if visit.status == "cancelled":
            return "cancelled"
        if visit.status == "pre_consulted":
            return "pre_consulted"
        if visit.status in ("in_progress", "registered"):
            return "in_progress"
        return visit.status
    if rx_status is not None:
        if rx_status == "final":
            return "completed"
        if rx_status == "cancelled":
            return "cancelled"
        return "in_progress"
    return "registered"


def resolve_visit_status_for_prescription(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    prescription_status: str,
) -> str:
    """Queue status for normalized prescription reads (joins opd.visits when present)."""
    return resolve_visit_statuses_for_prescriptions(
        session,
        tenant_id,
        [(visit_id, prescription_status)],
    ).get(visit_id, "registered")


def resolve_visit_statuses_for_prescriptions(
    session: Session,
    tenant_id: UUID,
    entries: list[tuple[UUID, str]],
) -> dict[UUID, str]:
    """Batch queue-status resolution for many visit + prescription-status pairs."""
    if not entries:
        return {}

    visit_ids = [visit_id for visit_id, _ in entries]
    visits = session.scalars(
        select(Visit).where(
            Visit.id.in_(visit_ids),
            Visit.tenant_id == tenant_id,
        )
    ).all()
    visit_by_id = {visit.id: visit for visit in visits}

    resolved: dict[UUID, str] = {}
    for visit_id, prescription_status in entries:
        visit = visit_by_id.get(visit_id)
        if visit is None:
            if prescription_status == "final":
                resolved[visit_id] = "completed"
            elif prescription_status == "cancelled":
                resolved[visit_id] = "cancelled"
            else:
                resolved[visit_id] = "registered"
            continue
        resolved[visit_id] = effective_encounter_status(
            visit,
            prescription_status=prescription_status,
        )
    return resolved

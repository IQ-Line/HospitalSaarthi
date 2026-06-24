"""OPD visit queue status resolution (visit row + prescription status)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from opd.data_access.prescription_form_data import prescription_form_data_has_content
from opd.models.visit import Visit

if TYPE_CHECKING:
    # Annotation-only: these resolvers accept either ORM row (legacy Prescription on
    # LegacyBase or normalized PrescriptionModel) — both duck-type .status/.id. Imported
    # under TYPE_CHECKING so `from __future__ import annotations` strings resolve for
    # type checkers + ruff without a runtime dependency on the soon-retired legacy model.
    from opd.models.prescription_row import Prescription


def _empty_draft_without_clinical_content(
    rx: Any,
    rx_status: str | None,
    *,
    session: Session | None = None,
) -> bool:
    if rx_status != "draft" or rx is None:
        return False
    return not prescription_form_data_has_content(rx, session=session)


def effective_encounter_status(
    visit: Visit | None,
    rx: Any = None,
    *,
    prescription_status: str | None = None,
    session: Session | None = None,
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
        if visit.status == "registered":
            return "registered"
        if visit.status == "in_progress":
            if _empty_draft_without_clinical_content(rx, rx_status, session=session):
                return "registered"
            return "in_progress"
        return visit.status
    if rx_status is not None:
        if rx_status == "final":
            return "completed"
        if rx_status == "cancelled":
            return "cancelled"
        if _empty_draft_without_clinical_content(rx, rx_status, session=session):
            return "registered"
        return "in_progress"
    return "registered"


def resolve_visit_status_for_prescription(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
    prescription_status: str,
    *,
    rx: Prescription | None = None,
) -> str:
    """Queue status for normalized prescription reads (joins opd.visits when present)."""
    return resolve_visit_statuses_for_prescriptions(
        session,
        tenant_id,
        [(visit_id, prescription_status)],
        rx_by_visit_id={visit_id: rx} if rx is not None else None,
    ).get(visit_id, "registered")


def resolve_visit_statuses_for_prescriptions(
    session: Session,
    tenant_id: UUID,
    entries: list[tuple[UUID, str]],
    *,
    rx_by_visit_id: dict[UUID, Prescription] | None = None,
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
    rx_by_visit_id = rx_by_visit_id or {}

    resolved: dict[UUID, str] = {}
    for visit_id, prescription_status in entries:
        visit = visit_by_id.get(visit_id)
        rx = rx_by_visit_id.get(visit_id)
        if visit is None:
            if prescription_status == "final":
                resolved[visit_id] = "completed"
            elif prescription_status == "cancelled":
                resolved[visit_id] = "cancelled"
            else:
                resolved[visit_id] = effective_encounter_status(
                    None,
                    rx,
                    prescription_status=prescription_status,
                    session=session,
                )
            continue
        resolved[visit_id] = effective_encounter_status(
            visit,
            rx,
            prescription_status=prescription_status,
            session=session,
        )
    return resolved

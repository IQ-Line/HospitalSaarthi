"""Formatted visit number from registration.visit for pharmacy queue payloads."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from opd.models.registration_visit import RegistrationVisit


def load_formatted_visit_id(
    session: Session,
    tenant_id: UUID,
    visit_id: UUID,
) -> str | None:
    """Human-readable visit number (``registration.visit.visit_id``), if present."""
    row = session.get(RegistrationVisit, (tenant_id, visit_id))
    if row is None:
        return None
    formatted = row.formatted_visit_id.strip()
    if formatted:
        return formatted
    compact = str(visit_id).replace("-", "")[:8].upper()
    return f"VIS-{compact}"

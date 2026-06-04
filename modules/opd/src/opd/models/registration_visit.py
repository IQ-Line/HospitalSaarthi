"""Read-only mapping of ``registration.visit`` for the OPD patients queue.

Cross-schema read (same PostgreSQL). Registration owns writes; OPD lists encounters here
until an event projection or generated client replaces this coupling.

Primary key is ``(iq_tenant_id, id)``. The ``visit_id`` column is the formatted visit number
(e.g. ``VIS-ABC12345``), not the encounter UUID used in API routes.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from opd.models.base import Base, TimestampMixin

REGISTRATION_SCHEMA = "registration"


class RegistrationVisit(Base, TimestampMixin):
    __tablename__ = "visit"
    __table_args__ = {"schema": REGISTRATION_SCHEMA}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        "iq_tenant_id",
        Uuid(as_uuid=True),
        primary_key=True,
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    formatted_visit_id: Mapped[str] = mapped_column("visit_id", Text, nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    visit_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    facility_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)

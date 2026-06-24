from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, SmallInteger, String, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from opd.core.schemas import SCHEMA
from opd.models.base import TimestampMixin
from opd.models.legacy_base import LegacyBase

PRESCRIPTION_STATUS = SAEnum(
    "draft",
    "final",
    "cancelled",
    name="prescription_status",
    schema=SCHEMA,
    create_type=False,
)


class Prescription(LegacyBase, TimestampMixin):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column("iq_tenant_id", Uuid(as_uuid=True), nullable=False)
    visit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        unique=True,
        doc="Logical ref opd.visits.id; PostgreSQL FK is created in Alembic revision 0001",
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    vitals_schema_version: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        PRESCRIPTION_STATUS.with_variant(String(32), "sqlite"),
        nullable=False,
        default="draft",
    )
    form_data: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=False,
        default=dict,
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

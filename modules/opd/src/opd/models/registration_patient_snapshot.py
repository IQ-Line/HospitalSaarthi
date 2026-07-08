"""Read-only mapping of ``registration.registration`` patient demographics snapshot.

Cross-schema read (same PostgreSQL). Registration owns writes; OPD reads the
denormalized patient fields captured at check-in for downstream queue payloads.
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, SmallInteger, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from opd.models.base import Base, TimestampMixin
from opd.models.registration_visit import REGISTRATION_SCHEMA


class RegistrationPatientSnapshot(Base, TimestampMixin):
    __tablename__ = "registration"
    __table_args__ = {"schema": REGISTRATION_SCHEMA}

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        "iq_tenant_id",
        Uuid(as_uuid=True),
        primary_key=True,
    )
    registration_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    patient_uhid: Mapped[str] = mapped_column(Text, nullable=False)
    patient_full_name: Mapped[str] = mapped_column(Text, nullable=False)
    patient_phone_number: Mapped[str] = mapped_column(Text, nullable=False)
    patient_gender: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient_date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    patient_year_of_birth: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    patient_abha_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    patient_abha_address: Mapped[str | None] = mapped_column(Text, nullable=True)

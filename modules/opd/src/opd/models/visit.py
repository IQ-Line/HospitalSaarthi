from __future__ import annotations

import uuid

from sqlalchemy import Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from opd.models.base import Base, TimestampMixin
from opd.models.prescription.mixins import TenantPrimaryKeyMixin


class Visit(TenantPrimaryKeyMixin, Base, TimestampMixin):
    __tablename__ = "visits"

    # Citus distribution key ``iq_tenant_id`` leads the composite PK (via
    # ``TenantPrimaryKeyMixin``); ``id`` completes it. See migration 0007.
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="registered")


"""Patient health document metadata (files stored in Azure Blob)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from opd.models.base import AuditActorMixin, Base, TimestampMixin
from opd.models.prescription.mixins import TenantPrimaryKeyMixin


class HealthDocument(TenantPrimaryKeyMixin, TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "health_documents"
    __table_args__ = (
        Index("health_documents_tenant_patient_idx", "tenant_id", "patient_id"),
        Index("health_documents_tenant_visit_idx", "tenant_id", "visit_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    visit_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    hi_type: Mapped[str] = mapped_column(Text, nullable=False)
    document_title: Mapped[str] = mapped_column(Text, nullable=False)
    original_file_name: Mapped[str] = mapped_column(Text, nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    blob_url: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")

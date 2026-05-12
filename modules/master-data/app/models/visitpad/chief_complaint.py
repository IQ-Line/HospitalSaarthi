"""SQLAlchemy models for Visitpad ``chief_complaints`` — global vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, JSON, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadChiefComplaintPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "chief_complaints"
    __table_args__ = (
        Index(
            "chief_complaints_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    body_system: Mapped[str] = mapped_column(String(64), nullable=False)
    triage_priority: Mapped[str] = mapped_column(String(32), nullable=False)
    synonyms: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_paediatric_relevant: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class VisitpadChiefComplaintTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "chief_complaints"
    __table_args__ = (
        Index(
            "chief_complaints_tenant_code_active_key",
            "iq_tenant_id",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    body_system: Mapped[str] = mapped_column(String(64), nullable=False)
    triage_priority: Mapped[str] = mapped_column(String(32), nullable=False)
    synonyms: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_paediatric_relevant: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


VisitpadChiefComplaintModel = VisitpadChiefComplaintPublicModel

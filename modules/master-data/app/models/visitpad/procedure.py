"""SQLAlchemy models for Visitpad ``procedures`` — global_master vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadProcedurePublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "procedures"
    __table_args__ = (
        Index(
            "procedures_global_cpt_active_key",
            "cpt_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cpt_code: Mapped[str] = mapped_column(String(16), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    official_descriptor: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    billing_category: Mapped[str] = mapped_column(String(64), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    requires_consent: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    type_modality: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class VisitpadProcedureTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "procedures"
    __table_args__ = (
        Index(
            "procedures_tenant_cpt_active_key",
            "iq_tenant_id",
            "cpt_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    cpt_code: Mapped[str] = mapped_column(String(16), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    official_descriptor: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    billing_category: Mapped[str] = mapped_column(String(64), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    requires_consent: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    type_modality: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


VisitpadProcedureModel = VisitpadProcedurePublicModel

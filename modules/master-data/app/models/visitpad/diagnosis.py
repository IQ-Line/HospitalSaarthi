"""SQLAlchemy models for Visitpad ``diagnoses`` — master_global vs ``master_tenant``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadDiagnosisPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "diagnoses"
    __table_args__ = (
        Index(
            "diagnoses_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    icd10_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    icd_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    official_descriptor: Mapped[str | None] = mapped_column(String(512), nullable=True)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_chronic_flag: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_notifiable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class VisitpadDiagnosisTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "diagnoses"
    __table_args__ = (
        Index(
            "diagnoses_tenant_code_active_key",
            "iq_tenant_id",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    icd10_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    icd_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    official_descriptor: Mapped[str | None] = mapped_column(String(512), nullable=True)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_chronic_flag: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_notifiable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


VisitpadDiagnosisModel = VisitpadDiagnosisPublicModel

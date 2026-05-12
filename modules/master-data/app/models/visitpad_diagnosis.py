"""SQLAlchemy models for Visitpad ``diagnoses`` — global vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VisitpadDiagnosisPublicModel(TimestampMixin, Base):
    __tablename__ = "diagnoses"
    __table_args__ = (
        Index(
            "diagnoses_global_icd_active_key",
            "icd10_code",
            "icd_version",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    icd10_code: Mapped[str] = mapped_column(String(16), nullable=False)
    icd_version: Mapped[str] = mapped_column(String(32), nullable=False)
    official_descriptor: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    is_chronic_flag: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_notifiable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class VisitpadDiagnosisTenantModel(TimestampMixin, Base):
    __tablename__ = "diagnoses"
    __table_args__ = (
        Index(
            "diagnoses_tenant_icd_active_key",
            "tenant_id",
            "icd10_code",
            "icd_version",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[int] = mapped_column(Integer(), nullable=False)
    icd10_code: Mapped[str] = mapped_column(String(16), nullable=False)
    icd_version: Mapped[str] = mapped_column(String(32), nullable=False)
    official_descriptor: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    is_chronic_flag: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_notifiable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


VisitpadDiagnosisModel = VisitpadDiagnosisPublicModel

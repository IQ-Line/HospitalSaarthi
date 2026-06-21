"""SQLAlchemy models for Visitpad ``chronic_illnesses`` — master_global vs ``master_tenant``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadChronicIllnessPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "chronic_illnesses"
    __table_args__ = (
        Index(
            "chronic_illnesses_global_icd_active_key",
            "icd10_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    icd10_code: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chronic_illness_prompt: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadChronicIllnessTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "chronic_illnesses"
    __table_args__ = (
        Index(
            "chronic_illnesses_tenant_icd_active_key",
            "iq_tenant_id",
            "icd10_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    icd10_code: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chronic_illness_prompt: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadChronicIllnessModel = VisitpadChronicIllnessPublicModel

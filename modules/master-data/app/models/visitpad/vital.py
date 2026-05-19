"""SQLAlchemy models for Visitpad ``vitals`` — global_master vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, Index, Integer, JSON, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadVitalPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "vitals"
    __table_args__ = (
        Index(
            "vitals_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    short_name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    data_type: Mapped[str] = mapped_column(String(32), nullable=False)
    unit: Mapped[str] = mapped_column(String(128), nullable=False)
    default_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    allowed_units: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    critical_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    critical_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_kind: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    normal_range_adult: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    normal_range_paediatric: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    input_method: Mapped[str] = mapped_column(String(32), nullable=False)
    is_paired: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    pair_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    loinc_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    snomed_observable_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class VisitpadVitalTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "vitals"
    __table_args__ = (
        Index(
            "vitals_tenant_code_active_key",
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
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    short_name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    data_type: Mapped[str] = mapped_column(String(32), nullable=False)
    unit: Mapped[str] = mapped_column(String(128), nullable=False)
    default_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    allowed_units: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    critical_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    critical_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_kind: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    normal_range_adult: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    normal_range_paediatric: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    input_method: Mapped[str] = mapped_column(String(32), nullable=False)
    is_paired: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    pair_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    loinc_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    snomed_observable_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


VisitpadVitalModel = VisitpadVitalPublicModel

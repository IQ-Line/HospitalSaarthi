"""SQLAlchemy models for Visitpad ``unit_conversions`` — master_global vs ``master_tenant``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Double, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadUnitConversionPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "unit_conversions"
    __table_args__ = (
        Index(
            "unit_conversions_global_from_to_active_key",
            "from_unit_code",
            "to_unit_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    to_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    factor: Mapped[float] = mapped_column(Double(), nullable=False)
    offset_value: Mapped[float] = mapped_column(Double(), nullable=False, default=0.0)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadUnitConversionTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "unit_conversions"
    __table_args__ = (
        Index(
            "unit_conversions_tenant_from_to_active_key",
            "iq_tenant_id",
            "from_unit_code",
            "to_unit_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    from_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    to_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    factor: Mapped[float] = mapped_column(Double(), nullable=False)
    offset_value: Mapped[float] = mapped_column(Double(), nullable=False, default=0.0)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadUnitConversionModel = VisitpadUnitConversionPublicModel

"""SQLAlchemy models for Visitpad ``units``: global rows (no ``iq_tenant_id``) vs ``tenant_master`` rows."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadUnitPublicModel(TimestampMixin, AuditActorMixin, Base):
    """Platform-wide unit definition in the ``global_master`` schema."""

    __tablename__ = "units"
    __table_args__ = (
        Index(
            "units_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    dimension: Mapped[str] = mapped_column(String(32), nullable=False)
    ucum_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_canonical: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadUnitTenantModel(TimestampMixin, AuditActorMixin, Base):
    """Tenant-scoped unit definitions in ``tenant_master``."""

    __tablename__ = "units"
    __table_args__ = (
        Index(
            "units_tenant_code_active_key",
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
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    dimension: Mapped[str] = mapped_column(String(32), nullable=False)
    ucum_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_canonical: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadUnitModel = VisitpadUnitPublicModel

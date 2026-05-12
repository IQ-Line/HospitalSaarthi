"""SQLAlchemy models for Visitpad ``rx_columns`` — global vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadRxColumnPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "rx_columns"
    __table_args__ = (
        Index(
            "rx_columns_global_section_code_active_key",
            "section",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    extra_unit: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadRxColumnTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "rx_columns"
    __table_args__ = (
        Index(
            "rx_columns_tenant_section_code_active_key",
            "iq_tenant_id",
            "section",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[int] = mapped_column(Integer(), nullable=False)
    section: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    extra_unit: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadRxColumnModel = VisitpadRxColumnPublicModel

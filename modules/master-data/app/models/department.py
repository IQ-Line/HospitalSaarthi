"""SQLAlchemy models for hospital departments — ``global_master`` vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, Index, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin

_DEPARTMENT_TYPES = ("clinical", "diagnostic", "administrative", "support")
_TYPE_CHECK = "type IN ('clinical', 'diagnostic', 'administrative', 'support')"


class DepartmentPublicModel(TimestampMixin, AuditActorMixin, Base):
    """Platform-wide department catalog in ``global_master``."""

    __tablename__ = "departments"
    __table_args__ = (
        CheckConstraint(_TYPE_CHECK, name="departments_type_check"),
        Index(
            "departments_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class DepartmentTenantModel(TimestampMixin, AuditActorMixin, Base):
    """Tenant-scoped departments in ``tenant_master``."""

    __tablename__ = "departments"
    __table_args__ = (
        CheckConstraint(_TYPE_CHECK, name="tm_departments_type_check"),
        Index(
            "tm_departments_code_active_key",
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
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


DepartmentModel = DepartmentPublicModel

"""SQLAlchemy models for module↔permission junction: ``public`` vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ModulePermissionPublicModel(TimestampMixin, Base):
    """Platform-wide junction rows (``public``)."""

    __tablename__ = "module_permissions"
    __table_args__ = (
        Index(
            "module_permissions_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "module_permissions_module_permission_active_key",
            "module_id",
            "permission_id",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    module_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("modules.id", ondelete="RESTRICT"),
        nullable=False,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("permissions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


class ModulePermissionTenantModel(TimestampMixin, Base):
    """Tenant-scoped junction rows."""

    __tablename__ = "module_permissions"
    __table_args__ = (
        Index(
            "tm_module_permissions_slug_active_key",
            "tenant_id",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "tm_module_permissions_module_permission_active_key",
            "tenant_id",
            "module_id",
            "permission_id",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[int] = mapped_column(Integer(), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    module_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenant_master.modules.id", ondelete="RESTRICT"),
        nullable=False,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenant_master.permissions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


ModulePermissionModel = ModulePermissionPublicModel

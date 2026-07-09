"""SQLAlchemy models for system_role↔permission junction: ``master_global`` vs ``master_tenant``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import Base, TimestampMixin


class SystemRolePermissionPublicModel(TimestampMixin, Base):
    """Platform-wide junction rows (``master_global``)."""

    __tablename__ = "system_role_permissions"
    __table_args__ = (
        Index(
            "system_role_permissions_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        Index(
            "system_role_permissions_role_permission_active_key",
            "system_role_id",
            "permission_id",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    system_role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{GLOBAL_SCHEMA}.system_roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{GLOBAL_SCHEMA}.permissions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


class SystemRolePermissionTenantModel(TimestampMixin, Base):
    """Tenant-scoped junction rows."""

    __tablename__ = "system_role_permissions"
    __table_args__ = (
        Index(
            "tm_system_role_permissions_slug_active_key",
            "iq_tenant_id",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        Index(
            "tm_system_role_permissions_role_permission_active_key",
            "iq_tenant_id",
            "system_role_id",
            "permission_id",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    system_role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{TENANT_SCHEMA}.system_roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{TENANT_SCHEMA}.permissions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_default: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


SystemRolePermissionModel = SystemRolePermissionPublicModel

"""SQLAlchemy models for the module registry: ``public`` (global) vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ModulePublicModel(TimestampMixin, Base):
    """Platform-wide module tree in the default schema (``public``)."""

    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="modules_category_check",
        ),
        CheckConstraint("level >= 1 AND level <= 10", name="modules_level_check"),
        Index(
            "modules_name_active_key",
            "name",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "modules_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("modules.id", ondelete="RESTRICT"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)

    category: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)

    level: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    icon: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


class ModuleTenantModel(TimestampMixin, Base):
    """Tenant-scoped module tree in ``tenant_master``."""

    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="tm_modules_category_check",
        ),
        CheckConstraint("level >= 1 AND level <= 10", name="tm_modules_level_check"),
        Index(
            "tm_modules_name_active_key",
            "iq_tenant_id",
            "name",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "tm_modules_slug_active_key",
            "iq_tenant_id",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenant_master.modules.id", ondelete="RESTRICT"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)

    category: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)

    level: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    icon: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


ModuleModel = ModulePublicModel

"""SQLAlchemy models for the module registry: ``master_global`` vs ``master_tenant``."""

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

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import Base, TimestampMixin


class ModulePublicModel(TimestampMixin, Base):
    """Platform-wide module tree in ``master_global``."""

    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="modules_category_check",
        ),
        CheckConstraint("level >= 1 AND level <= 10", name="modules_level_check"),
        CheckConstraint(
            "module_kind IN ('platform', 'foundation', 'product')",
            name="modules_module_kind_check",
        ),
        CheckConstraint(
            "visibility_scope IN ('superadmin', 'tenant')",
            name="modules_visibility_scope_check",
        ),
        Index(
            "modules_name_active_key",
            "name",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        Index(
            "modules_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{GLOBAL_SCHEMA}.modules.id", ondelete="RESTRICT"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)

    category: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)

    level: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    module_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="product")
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    visibility_scope: Mapped[str] = mapped_column(String(16), nullable=False, default="tenant")
    icon: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


class ModuleTenantModel(TimestampMixin, Base):
    """Tenant-scoped module tree in ``master_tenant``."""

    __tablename__ = "modules"
    __table_args__ = (
        CheckConstraint(
            "category IN ('core', 'clinical', 'administrative', 'support')",
            name="tm_modules_category_check",
        ),
        CheckConstraint("level >= 1 AND level <= 10", name="tm_modules_level_check"),
        CheckConstraint(
            "module_kind IN ('platform', 'foundation', 'product')",
            name="tm_modules_module_kind_check",
        ),
        CheckConstraint(
            "visibility_scope IN ('superadmin', 'tenant')",
            name="tm_modules_visibility_scope_check",
        ),
        Index(
            "tm_modules_name_active_key",
            "iq_tenant_id",
            "name",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        Index(
            "tm_modules_slug_active_key",
            "iq_tenant_id",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{TENANT_SCHEMA}.modules.id", ondelete="RESTRICT"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)

    category: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)

    level: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    module_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="product")
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    visibility_scope: Mapped[str] = mapped_column(String(16), nullable=False, default="tenant")
    icon: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)


ModuleModel = ModulePublicModel

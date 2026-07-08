"""SQLAlchemy models for ``inventory_categories`` — global_master vs tenant_master."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class InventoryCategoryPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_categories"
    __table_args__ = (
        Index(
            "inventory_categories_name_active_key",
            text("lower(trim(name))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    parent_category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{GLOBAL_SCHEMA}.inventory_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class InventoryCategoryTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_categories"
    __table_args__ = (
        Index(
            "tm_inventory_categories_name_active_key",
            "iq_tenant_id",
            text("lower(trim(name))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    parent_category_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{TENANT_SCHEMA}.inventory_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


InventoryCategoryModel = InventoryCategoryPublicModel

"""SQLAlchemy models for ``inventory_item_types`` — global_master vs tenant_master."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class InventoryItemTypePublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_item_types"
    __table_args__ = (
        Index(
            "inventory_item_types_name_active_key",
            text("lower(trim(name))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class InventoryItemTypeTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_item_types"
    __table_args__ = (
        Index(
            "tm_inventory_item_types_name_active_key",
            "iq_tenant_id",
            text("lower(trim(name))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


InventoryItemTypeModel = InventoryItemTypePublicModel

"""SQLAlchemy models for ``inventory_store_types`` — global_master vs tenant_master."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class InventoryStoreTypePublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_store_types"
    __table_args__ = (
        Index(
            "inventory_store_types_code_active_key",
            text("lower(trim(code))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "inventory_store_types_name_active_key",
            text("lower(trim(name))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(Text(), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False, default="")
    can_receive_stock: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    can_dispense: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    can_issue_to_ward: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    track_batch_expiry: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    indent_authority: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    default_indent_target_store_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class InventoryStoreTypeTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_store_types"
    __table_args__ = (
        Index(
            "tm_inventory_store_types_code_active_key",
            "iq_tenant_id",
            text("lower(trim(code))"),
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        Index(
            "tm_inventory_store_types_name_active_key",
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
    code: Mapped[str] = mapped_column(Text(), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False, default="")
    can_receive_stock: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    can_dispense: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    can_issue_to_ward: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    track_batch_expiry: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    indent_authority: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    default_indent_target_store_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


InventoryStoreTypeModel = InventoryStoreTypePublicModel

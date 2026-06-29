"""SQLAlchemy models for ``inventory_storage_conditions`` — global_master vs tenant_master."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class InventoryStorageConditionPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_storage_conditions"
    __table_args__ = ({"schema": GLOBAL_SCHEMA},)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class InventoryStorageConditionTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_storage_conditions"
    __table_args__ = ({"schema": TENANT_SCHEMA},)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


InventoryStorageConditionModel = InventoryStorageConditionPublicModel

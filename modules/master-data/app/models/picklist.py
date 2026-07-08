"""SQLAlchemy models for platform picklist catalog in ``master_global``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Text, UniqueConstraint, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin

_PICKLIST_FK = f"{GLOBAL_SCHEMA}.picklist.id"


class PicklistModel(TimestampMixin, AuditActorMixin, Base):
    """Picklist domain header (e.g. gender, role-types)."""

    __tablename__ = "picklist"
    __table_args__ = (
        Index(
            "picklist_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class PicklistValueModel(TimestampMixin, Base):
    """Value row for a picklist domain."""

    __tablename__ = "picklist_values"
    __table_args__ = (
        UniqueConstraint("category_id", "value", name="uq_picklist_values_category_value"),
        Index("idx_picklist_values_category", "category_id"),
        Index("idx_picklist_values_order", "category_id", "display_order"),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(_PICKLIST_FK, ondelete="RESTRICT"),
        nullable=False,
    )
    value: Mapped[str] = mapped_column(Text(), nullable=False)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_global: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)

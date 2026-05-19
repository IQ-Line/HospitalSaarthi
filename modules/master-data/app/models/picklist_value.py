"""SQLAlchemy models for picklist value (item) catalog (``global_master`` only)."""

from __future__ import annotations

import uuid

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA
from app.models.base import Base, TimestampMixin


class PicklistValuePublicModel(TimestampMixin, Base):
    """Platform-wide picklist values (``global_master``)."""

    __tablename__ = "picklist_values"
    __table_args__ = (
        UniqueConstraint("category_id", "value", name="uq_picklist_values_category_value"),
        Index("idx_picklist_values_slug", "slug", unique=True),
        Index("idx_picklist_values_category", "category_id"),
        Index("idx_picklist_values_order", "category_id", "display_order"),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(f"{GLOBAL_SCHEMA}.picklist.id", name="picklist_values_category_id_fkey"),
        nullable=False,
    )
    value: Mapped[str] = mapped_column(Text(), nullable=False)
    label: Mapped[str] = mapped_column(Text(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)


PicklistValueModel = PicklistValuePublicModel

"""SQLAlchemy models for picklist domain catalog (``global_master`` only)."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class PicklistPublicModel(TimestampMixin, AuditActorMixin, Base):
    """Platform-wide picklist domain headers (``global_master``)."""

    __tablename__ = "picklist"
    __table_args__ = (
        Index(
            "picklist_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


PicklistModel = PicklistPublicModel

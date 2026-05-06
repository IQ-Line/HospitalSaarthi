"""SQLAlchemy model for the platform module registry (`master_data.modules`).

Columns match ``schema-reference.json`` / LLD: tree (`parent_id`, `level`), stable keys
(`name`, `slug`), catalog metadata (`category`, `version`, `is_active`),
soft-delete (`is_deleted`), and optional audit actor UUIDs (`created_by`, `updated_by`).
"""

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


class ModuleModel(TimestampMixin, Base):
    """One deployable product module (core or feature) in the platform catalog."""

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

    # Primary key: random UUID v4 per row. ``Uuid(as_uuid=True)`` ↔ Python ``uuid.UUID``;
    # ``default=uuid.uuid4`` assigns an id when the app inserts without supplying ``id``.
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("master_data.modules.id", ondelete="RESTRICT"),
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

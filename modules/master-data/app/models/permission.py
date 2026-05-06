"""SQLAlchemy model for permission catalog (`master_data.permissions`)."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, CheckConstraint, Index, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class PermissionModel(TimestampMixin, Base):
    """Platform permission definition (catalog row, not user assignment)."""

    __tablename__ = "permissions"
    __table_args__ = (
        CheckConstraint(
            "action IN ('create', 'read', 'update', 'delete', 'manage')",
            name="permissions_action_check",
        ),
        Index(
            "permissions_slug_active_key",
            "slug",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text(), nullable=False)
    slug: Mapped[str] = mapped_column(Text(), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)

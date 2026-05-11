"""SQLAlchemy model for the Visitpad ``unit_conversions`` catalog table."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Double, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VisitpadUnitConversionModel(TimestampMixin, Base):
    """Linear conversion: value_to = value_from * factor + offset_value."""

    __tablename__ = "unit_conversions"
    __table_args__ = (
        Index(
            "unit_conversions_tenant_from_to_active_key",
            "tenant_id",
            "from_unit_code",
            "to_unit_code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    from_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    to_unit_code: Mapped[str] = mapped_column(String(64), nullable=False)
    factor: Mapped[float] = mapped_column(Double(), nullable=False)
    offset_value: Mapped[float] = mapped_column(Double(), nullable=False, default=0.0)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)

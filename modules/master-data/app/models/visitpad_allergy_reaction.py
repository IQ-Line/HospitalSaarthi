"""SQLAlchemy models for Visitpad ``allergy_reactions`` — global vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VisitpadAllergyReactionPublicModel(TimestampMixin, Base):
    __tablename__ = "allergy_reactions"
    __table_args__ = (
        Index(
            "allergy_reactions_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadAllergyReactionTenantModel(TimestampMixin, Base):
    __tablename__ = "allergy_reactions"
    __table_args__ = (
        Index(
            "allergy_reactions_tenant_code_active_key",
            "tenant_id",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": "tenant_master"},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[int] = mapped_column(Integer(), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadAllergyReactionModel = VisitpadAllergyReactionPublicModel

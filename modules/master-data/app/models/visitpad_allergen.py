"""SQLAlchemy models for Visitpad ``allergens`` — global vs ``tenant_master``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class VisitpadAllergenPublicModel(TimestampMixin, Base):
    __tablename__ = "allergens"
    __table_args__ = (
        Index(
            "allergens_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    allergen_type: Mapped[str] = mapped_column(String(32), nullable=False)
    drug_class: Mapped[str | None] = mapped_column(String(256), nullable=True)
    reaction_severity_default: Mapped[str] = mapped_column(String(32), nullable=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadAllergenTenantModel(TimestampMixin, Base):
    __tablename__ = "allergens"
    __table_args__ = (
        Index(
            "allergens_tenant_code_active_key",
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
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(256), nullable=False)
    allergen_type: Mapped[str] = mapped_column(String(32), nullable=False)
    drug_class: Mapped[str | None] = mapped_column(String(256), nullable=True)
    reaction_severity_default: Mapped[str] = mapped_column(String(32), nullable=False)
    snomed_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadAllergenModel = VisitpadAllergenPublicModel

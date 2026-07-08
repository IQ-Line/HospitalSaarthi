"""SQLAlchemy models for ``inventory_hsn_gst`` — global_master vs tenant_master."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, Index, Numeric, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class InventoryHsnGstPublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_hsn_gst"
    __table_args__ = (
        Index(
            "inventory_hsn_gst_code_effective_active_key",
            "hsn_code",
            "effective_from",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        # PG-only regex CHECK; skipped on the sqlite test engine (format still enforced in PG).
        CheckConstraint(
            "hsn_code ~ '^\\d{4,8}$'",
            name="inventory_hsn_gst_hsn_code_format_chk",
        ).ddl_if(dialect="postgresql"),
        CheckConstraint(
            "cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0",
            name="inventory_hsn_gst_rates_non_negative_chk",
        ),
        CheckConstraint(
            "remarks IS NULL OR length(remarks) <= 200",
            name="inventory_hsn_gst_remarks_max_length_chk",
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hsn_code: Mapped[str] = mapped_column(Text(), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date(), nullable=False)
    cgst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    sgst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    igst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    supporting_document_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class InventoryHsnGstTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "inventory_hsn_gst"
    __table_args__ = (
        Index(
            "tm_inventory_hsn_gst_code_effective_active_key",
            "iq_tenant_id",
            "hsn_code",
            "effective_from",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
        ),
        # PG-only regex CHECK; skipped on the sqlite test engine (format still enforced in PG).
        CheckConstraint(
            "hsn_code ~ '^\\d{4,8}$'",
            name="tm_inventory_hsn_gst_hsn_code_format_chk",
        ).ddl_if(dialect="postgresql"),
        CheckConstraint(
            "cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0",
            name="tm_inventory_hsn_gst_rates_non_negative_chk",
        ),
        CheckConstraint(
            "remarks IS NULL OR length(remarks) <= 200",
            name="tm_inventory_hsn_gst_remarks_max_length_chk",
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    hsn_code: Mapped[str] = mapped_column(Text(), nullable=False)
    effective_from: Mapped[date] = mapped_column(Date(), nullable=False)
    cgst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    sgst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    igst_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    supporting_document_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


InventoryHsnGstModel = InventoryHsnGstPublicModel

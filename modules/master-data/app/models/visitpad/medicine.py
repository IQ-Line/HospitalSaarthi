"""SQLAlchemy models for Visitpad ``medicines`` — master_global vs ``master_tenant``."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, Index, Integer, JSON, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.catalog_schemas import GLOBAL_SCHEMA, TENANT_SCHEMA
from app.models.base import AuditActorMixin, Base, TimestampMixin


class VisitpadMedicinePublicModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "medicines"
    __table_args__ = (
        Index(
            "medicines_global_code_active_key",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": GLOBAL_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    generic_name: Mapped[str] = mapped_column(String(512), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    brand_names: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    drug_class: Mapped[str] = mapped_column(String(256), nullable=False)
    drug_subclass: Mapped[str | None] = mapped_column(String(256), nullable=True)
    dosage_form: Mapped[str] = mapped_column(String(128), nullable=False)
    route_of_admin: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    strength_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    strength_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    strength_display: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    concentration_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    concentration_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    volume_per_unit: Mapped[float | None] = mapped_column(Float, nullable=True)
    sku_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pack_size: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    pack_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(256), nullable=True)
    storage_condition: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expiry_tracking: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_dispensable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    schedule: Mapped[str] = mapped_column(String(16), nullable=False)
    is_controlled_substance: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_narcotic: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    requires_prescription: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_restricted_antibiotic: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    allergen_classes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    contraindications: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    search_tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    atc_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    rxnorm_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    snomed_substance_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    snomed_product_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pregnancy_category: Mapped[str | None] = mapped_column(String(8), nullable=True)
    lactation_safety: Mapped[str | None] = mapped_column(String(32), nullable=True)
    pediatric_use: Mapped[str | None] = mapped_column(String(32), nullable=True)
    max_dose_per_day_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_dose_per_day_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    black_box_warning: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    black_box_warning_text: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    default_dose_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    default_dose_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    default_frequency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_duration_days: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    default_route: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_instructions: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    typical_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


class VisitpadMedicineTenantModel(TimestampMixin, AuditActorMixin, Base):
    __tablename__ = "medicines"
    __table_args__ = (
        Index(
            "medicines_tenant_code_active_key",
            "iq_tenant_id",
            "code",
            unique=True,
            postgresql_where=text("NOT is_deleted"),
            sqlite_where=text("is_deleted = 0"),
        ),
        {"schema": TENANT_SCHEMA},
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iq_tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    generic_name: Mapped[str] = mapped_column(String(512), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    brand_names: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    drug_class: Mapped[str] = mapped_column(String(256), nullable=False)
    drug_subclass: Mapped[str | None] = mapped_column(String(256), nullable=True)
    dosage_form: Mapped[str] = mapped_column(String(128), nullable=False)
    route_of_admin: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    strength_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    strength_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    strength_display: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    concentration_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    concentration_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    volume_per_unit: Mapped[float | None] = mapped_column(Float, nullable=True)
    sku_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pack_size: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    pack_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(256), nullable=True)
    storage_condition: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expiry_tracking: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_dispensable: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    schedule: Mapped[str] = mapped_column(String(16), nullable=False)
    is_controlled_substance: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_narcotic: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    requires_prescription: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    is_restricted_antibiotic: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    allergen_classes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    contraindications: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    search_tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    atc_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    rxnorm_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    snomed_substance_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    snomed_product_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pregnancy_category: Mapped[str | None] = mapped_column(String(8), nullable=True)
    lactation_safety: Mapped[str | None] = mapped_column(String(32), nullable=True)
    pediatric_use: Mapped[str | None] = mapped_column(String(32), nullable=True)
    max_dose_per_day_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_dose_per_day_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    black_box_warning: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    black_box_warning_text: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    default_dose_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    default_dose_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    default_frequency: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_duration_days: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    default_route: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_instructions: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    typical_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)


VisitpadMedicineModel = VisitpadMedicinePublicModel

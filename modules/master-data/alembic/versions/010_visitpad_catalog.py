"""Visitpad catalog tables in ``master_global`` (rx_columns, allergens, complaints, diagnoses, vitals, medicines, …).

Revision ID: 010_visitpad_catalog
Revises: 009_visitpad_units
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "010_visitpad_catalog"
down_revision: str | Sequence[str] | None = "009_visitpad_units"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_JSONB_EMPTY_ARRAY = sa.text("'[]'::jsonb")
_JSONB_EMPTY_OBJECT = sa.text("'{}'::jsonb")


def upgrade() -> None:
    op.create_table(
        "rx_columns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("extra_unit", sa.String(length=128), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "rx_columns_tenant_section_code_active_key",
        "rx_columns",
        ["tenant_id", "section", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "allergens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=False),
        sa.Column("allergen_type", sa.String(length=32), nullable=False),
        sa.Column("drug_class", sa.String(length=256), nullable=True),
        sa.Column("reaction_severity_default", sa.String(length=32), nullable=False),
        sa.Column("snomed_code", sa.String(length=64), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "allergens_tenant_code_active_key",
        "allergens",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "allergy_reactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "allergy_reactions_tenant_code_active_key",
        "allergy_reactions",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "chief_complaints",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=False),
        sa.Column("body_system", sa.String(length=64), nullable=False),
        sa.Column("triage_priority", sa.String(length=32), nullable=False),
        sa.Column("synonyms", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("is_paediatric_relevant", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("snomed_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "chief_complaints_tenant_code_active_key",
        "chief_complaints",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "diagnoses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("icd10_code", sa.String(length=16), nullable=False),
        sa.Column("icd_version", sa.String(length=32), nullable=False),
        sa.Column("official_descriptor", sa.String(length=512), nullable=False),
        sa.Column("display_name", sa.String(length=512), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("is_chronic_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_notifiable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("snomed_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "diagnoses_tenant_icd_active_key",
        "diagnoses",
        ["tenant_id", "icd10_code", "icd_version"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "chronic_illnesses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=512), nullable=False),
        sa.Column("icd10_code", sa.String(length=16), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("snomed_code", sa.String(length=64), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "chronic_illnesses_tenant_icd_active_key",
        "chronic_illnesses",
        ["tenant_id", "icd10_code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "vitals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("short_name", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("data_type", sa.String(length=32), nullable=False),
        sa.Column("unit", sa.String(length=128), nullable=False),
        sa.Column("default_unit_code", sa.String(length=64), nullable=False),
        sa.Column("allowed_units", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("critical_low", sa.Double(), nullable=True),
        sa.Column("critical_high", sa.Double(), nullable=True),
        sa.Column("reference_kind", sa.String(length=64), nullable=False),
        sa.Column("reference_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_OBJECT),
        sa.Column("normal_range_adult", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_OBJECT),
        sa.Column("normal_range_paediatric", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_OBJECT),
        sa.Column("input_method", sa.String(length=32), nullable=False),
        sa.Column("is_paired", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("pair_code", sa.String(length=64), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("loinc_code", sa.String(length=32), nullable=True),
        sa.Column("snomed_observable_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "vitals_tenant_code_active_key",
        "vitals",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "medicines",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=512), nullable=False),
        sa.Column("generic_name", sa.String(length=512), nullable=False),
        sa.Column("short_name", sa.String(length=256), nullable=True),
        sa.Column("brand_names", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("drug_class", sa.String(length=256), nullable=False),
        sa.Column("drug_subclass", sa.String(length=256), nullable=True),
        sa.Column("dosage_form", sa.String(length=128), nullable=False),
        sa.Column("route_of_admin", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("strength_value", sa.Double(), nullable=True),
        sa.Column("strength_unit", sa.String(length=32), nullable=True),
        sa.Column("strength_display", sa.String(length=256), nullable=False, server_default=sa.text("''")),
        sa.Column("concentration_value", sa.Double(), nullable=True),
        sa.Column("concentration_unit", sa.String(length=32), nullable=True),
        sa.Column("volume_per_unit", sa.Double(), nullable=True),
        sa.Column("sku_code", sa.String(length=64), nullable=True),
        sa.Column("barcode", sa.String(length=64), nullable=True),
        sa.Column("pack_size", sa.Integer(), nullable=True),
        sa.Column("pack_unit", sa.String(length=32), nullable=True),
        sa.Column("manufacturer", sa.String(length=256), nullable=True),
        sa.Column("storage_condition", sa.String(length=64), nullable=True),
        sa.Column("expiry_tracking", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_dispensable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("schedule", sa.String(length=16), nullable=False),
        sa.Column("is_controlled_substance", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_narcotic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("requires_prescription", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_restricted_antibiotic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("allergen_classes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("contraindications", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("search_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=_JSONB_EMPTY_ARRAY),
        sa.Column("atc_code", sa.String(length=32), nullable=True),
        sa.Column("rxnorm_code", sa.String(length=32), nullable=True),
        sa.Column("snomed_substance_code", sa.String(length=64), nullable=True),
        sa.Column("snomed_product_code", sa.String(length=64), nullable=True),
        sa.Column("pregnancy_category", sa.String(length=8), nullable=True),
        sa.Column("lactation_safety", sa.String(length=32), nullable=True),
        sa.Column("pediatric_use", sa.String(length=32), nullable=True),
        sa.Column("max_dose_per_day_value", sa.Double(), nullable=True),
        sa.Column("max_dose_per_day_unit", sa.String(length=32), nullable=True),
        sa.Column("black_box_warning", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("black_box_warning_text", sa.String(length=2048), nullable=True),
        sa.Column("default_dose_value", sa.Double(), nullable=True),
        sa.Column("default_dose_unit", sa.String(length=32), nullable=True),
        sa.Column("default_frequency", sa.String(length=64), nullable=True),
        sa.Column("default_duration_days", sa.Integer(), nullable=True),
        sa.Column("default_route", sa.String(length=64), nullable=True),
        sa.Column("default_instructions", sa.String(length=1024), nullable=True),
        sa.Column("typical_quantity", sa.Double(), nullable=True),
        sa.Column("notes", sa.String(length=2048), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "medicines_tenant_code_active_key",
        "medicines",
        ["tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )

    op.create_table(
        "procedures",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cpt_code", sa.String(length=16), nullable=False),
        sa.Column("official_descriptor", sa.String(length=512), nullable=False),
        sa.Column("display_name", sa.String(length=512), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("billing_category", sa.String(length=64), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("requires_consent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("type_modality", sa.String(length=128), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("snomed_code", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        schema=_GM,
    )
    op.create_index(
        "procedures_tenant_cpt_active_key",
        "procedures",
        ["tenant_id", "cpt_code"],
        unique=True,
        postgresql_where=sa.text("NOT is_deleted"),
        schema=_GM,
    )


def downgrade() -> None:
    op.drop_table("procedures")
    op.drop_table("medicines")
    op.drop_table("vitals")
    op.drop_table("chronic_illnesses")
    op.drop_table("diagnoses")
    op.drop_table("chief_complaints")
    op.drop_table("allergy_reactions")
    op.drop_table("allergens")
    op.drop_table("rx_columns")

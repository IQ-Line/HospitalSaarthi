"""Create the inventory master catalog tables (global_master + tenant_master).

The inventory-master feature (store types, UOMs, item types, categories, HSN/GST,
storage conditions) shipped with SQLAlchemy models, repositories, and mounted API
routes, but no migration ever created its tables — so every real database (dev, CI,
prod) 503s on these endpoints. The unit tests only passed because in-memory SQLite
fabricated the schema via ``Base.metadata.create_all``; the real-Postgres integration
tests exposed the gap. This migration closes it.

DDL is frozen (generated once from the models) so this revision is an immutable
snapshot, matching the 0001 baseline's convention. Like every other Master Data
catalog table, each table is registered as a Citus **reference** table when running
on Citus (a no-op on plain Postgres) — this module distributes nothing.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0003_inventory_masters"
down_revision: str | Sequence[str] | None = "0002_abdm_catalog_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLES: tuple[str, ...] = (
    """CREATE TABLE master_global.inventory_categories (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    parent_category_id UUID,
    description TEXT,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(parent_category_id) REFERENCES master_global.inventory_categories (id) ON DELETE SET NULL
)""",
    """CREATE TABLE master_global.inventory_hsn_gst (
    id UUID NOT NULL,
    hsn_code TEXT NOT NULL,
    effective_from DATE NOT NULL,
    cgst_pct NUMERIC(8, 4) NOT NULL,
    sgst_pct NUMERIC(8, 4) NOT NULL,
    igst_pct NUMERIC(8, 4) NOT NULL,
    supporting_document_url TEXT,
    remarks TEXT,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT inventory_hsn_gst_hsn_code_format_chk CHECK (hsn_code ~ '^\\d{4,8}$'),
    CONSTRAINT inventory_hsn_gst_rates_non_negative_chk CHECK (cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0),
    CONSTRAINT inventory_hsn_gst_remarks_max_length_chk CHECK (remarks IS NULL OR length(remarks) <= 200)
)""",
    """CREATE TABLE master_global.inventory_item_types (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_global.inventory_storage_conditions (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_global.inventory_store_types (
    id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    can_receive_stock BOOLEAN NOT NULL,
    can_dispense BOOLEAN NOT NULL,
    can_issue_to_ward BOOLEAN NOT NULL,
    track_batch_expiry BOOLEAN NOT NULL,
    indent_authority BOOLEAN NOT NULL,
    default_indent_target_store_id UUID,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_global.inventory_uoms (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_tenant.inventory_categories (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    parent_category_id UUID,
    description TEXT,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(parent_category_id) REFERENCES master_tenant.inventory_categories (id) ON DELETE SET NULL
)""",
    """CREATE TABLE master_tenant.inventory_hsn_gst (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    hsn_code TEXT NOT NULL,
    effective_from DATE NOT NULL,
    cgst_pct NUMERIC(8, 4) NOT NULL,
    sgst_pct NUMERIC(8, 4) NOT NULL,
    igst_pct NUMERIC(8, 4) NOT NULL,
    supporting_document_url TEXT,
    remarks TEXT,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT tm_inventory_hsn_gst_hsn_code_format_chk CHECK (hsn_code ~ '^\\d{4,8}$'),
    CONSTRAINT tm_inventory_hsn_gst_rates_non_negative_chk CHECK (cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0),
    CONSTRAINT tm_inventory_hsn_gst_remarks_max_length_chk CHECK (remarks IS NULL OR length(remarks) <= 200)
)""",
    """CREATE TABLE master_tenant.inventory_item_types (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_tenant.inventory_storage_conditions (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_tenant.inventory_store_types (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    can_receive_stock BOOLEAN NOT NULL,
    can_dispense BOOLEAN NOT NULL,
    can_issue_to_ward BOOLEAN NOT NULL,
    track_batch_expiry BOOLEAN NOT NULL,
    indent_authority BOOLEAN NOT NULL,
    default_indent_target_store_id UUID,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
    """CREATE TABLE master_tenant.inventory_uoms (
    id UUID NOT NULL,
    iq_tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID,
    updated_by UUID,
    PRIMARY KEY (id)
)""",
)

_INDEXES: tuple[str, ...] = (
    "CREATE UNIQUE INDEX inventory_categories_name_active_key ON master_global.inventory_categories (lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_hsn_gst_code_effective_active_key ON master_global.inventory_hsn_gst (hsn_code, effective_from) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_item_types_name_active_key ON master_global.inventory_item_types (lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_store_types_name_active_key ON master_global.inventory_store_types (lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_store_types_code_active_key ON master_global.inventory_store_types (lower(trim(code))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_uoms_name_active_key ON master_global.inventory_uoms (lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX inventory_uoms_abbreviation_active_key ON master_global.inventory_uoms (lower(trim(abbreviation))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_categories_name_active_key ON master_tenant.inventory_categories (iq_tenant_id, lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_hsn_gst_code_effective_active_key ON master_tenant.inventory_hsn_gst (iq_tenant_id, hsn_code, effective_from) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_item_types_name_active_key ON master_tenant.inventory_item_types (iq_tenant_id, lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_store_types_name_active_key ON master_tenant.inventory_store_types (iq_tenant_id, lower(trim(name))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_store_types_code_active_key ON master_tenant.inventory_store_types (iq_tenant_id, lower(trim(code))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_uoms_abbreviation_active_key ON master_tenant.inventory_uoms (iq_tenant_id, lower(trim(abbreviation))) WHERE NOT is_deleted",
    "CREATE UNIQUE INDEX tm_inventory_uoms_name_active_key ON master_tenant.inventory_uoms (iq_tenant_id, lower(trim(name))) WHERE NOT is_deleted",
)

# Qualified names in creation order — reference-table registration and drops both
# use this; the only FK is a self-reference (categories), so no cross-table order.
_QUALIFIED: tuple[str, ...] = (
    "master_global.inventory_categories",
    "master_global.inventory_hsn_gst",
    "master_global.inventory_item_types",
    "master_global.inventory_storage_conditions",
    "master_global.inventory_store_types",
    "master_global.inventory_uoms",
    "master_tenant.inventory_categories",
    "master_tenant.inventory_hsn_gst",
    "master_tenant.inventory_item_types",
    "master_tenant.inventory_storage_conditions",
    "master_tenant.inventory_store_types",
    "master_tenant.inventory_uoms",
)


def upgrade() -> None:
    bind = op.get_bind()
    for stmt in _TABLES:
        bind.exec_driver_sql(stmt)
    for stmt in _INDEXES:
        bind.exec_driver_sql(stmt)
    # Register as Citus reference tables when running on Citus; no-op on plain Postgres.
    for qualified in _QUALIFIED:
        bind.exec_driver_sql(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN "
            f"PERFORM create_reference_table('{qualified}'); "
            "END IF; END $$;"
        )


def downgrade() -> None:
    bind = op.get_bind()
    for qualified in reversed(_QUALIFIED):
        bind.exec_driver_sql(f"DROP TABLE IF EXISTS {qualified} CASCADE")

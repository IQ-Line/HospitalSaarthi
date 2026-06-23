"""Inventory reference masters in ``global_master`` / ``tenant_master`` + module catalog tree.

Revision ID: 044_inventory_masters_catalog
Revises: 043_platform_role_types_super_admin_and_admin

Operational inventory tables (items, stores, GRN, stock) remain in the ``inventory`` schema.
Master rows are owned by Master Data; inventory holds UUID references without cross-schema FKs.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "044_inventory_masters_catalog"
down_revision: str | Sequence[str] | None = "043_platform_role_types_super_admin_and_admin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SLUGS: tuple[str, ...] = ("read", "create", "edit", "delete")

_INVENTORY_L3_SEEDS: tuple[tuple[str, str, str], ...] = (
    ("Categories", "inventory-categories", "Inventory item category hierarchy."),
    ("Item Types", "inventory-item-types", "Inventory item type master."),
    ("Units of Measure", "inventory-uoms", "Purchase, consumption, and sale UOMs."),
    ("Manufacturers", "inventory-manufacturers", "Item and supply manufacturers."),
    ("HSN / GST", "inventory-hsn-gst", "HSN codes and GST rate schedules."),
    ("Storage Conditions", "inventory-storage-conditions", "Item storage condition master."),
    ("Store Types", "inventory-store-types", "Inventory store type definitions."),
)


def _audit_columns() -> tuple[sa.Column, ...]:
    return (
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def _id_column() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _reference_table(schema: str, table: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reference_table') THEN
                PERFORM create_reference_table('{schema}.{table}');
            END IF;
        END $$;
        """
    )


def _create_global_inventory_categories() -> None:
    op.create_table(
        "inventory_categories",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("parent_category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        *_audit_columns(),
        schema=_GM,
    )
    op.create_foreign_key(
        "inventory_categories_parent_fk",
        "inventory_categories",
        "inventory_categories",
        ["parent_category_id"],
        ["id"],
        source_schema=_GM,
        referent_schema=_GM,
        ondelete="SET NULL",
    )
    op.create_index(
        "idx_inventory_categories_parent",
        "inventory_categories",
        ["parent_category_id"],
        schema=_GM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_categories_name_active_key
        ON {_GM}.inventory_categories (lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )
    _reference_table(_GM, "inventory_categories")


def _create_tenant_inventory_categories() -> None:
    op.create_table(
        "inventory_categories",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("parent_category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_foreign_key(
        "tm_inventory_categories_parent_fk",
        "inventory_categories",
        "inventory_categories",
        ["parent_category_id"],
        ["id"],
        source_schema=_TM,
        referent_schema=_TM,
        ondelete="SET NULL",
    )
    op.create_index(
        "tm_idx_inventory_categories_tenant",
        "inventory_categories",
        ["iq_tenant_id"],
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_categories_parent",
        "inventory_categories",
        ["iq_tenant_id", "parent_category_id"],
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_categories_name_active_key
        ON {_TM}.inventory_categories (iq_tenant_id, lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )


def _create_global_inventory_item_types() -> None:
    op.create_table(
        "inventory_item_types",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_GM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_item_types_name_active_key
        ON {_GM}.inventory_item_types (lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )
    _reference_table(_GM, "inventory_item_types")


def _create_tenant_inventory_item_types() -> None:
    op.create_table(
        "inventory_item_types",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_item_types_tenant",
        "inventory_item_types",
        ["iq_tenant_id"],
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_item_types_name_active_key
        ON {_TM}.inventory_item_types (iq_tenant_id, lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )


def _create_global_inventory_uoms() -> None:
    op.create_table(
        "inventory_uoms",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("abbreviation", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_GM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_uoms_name_active_key
        ON {_GM}.inventory_uoms (lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_uoms_abbreviation_active_key
        ON {_GM}.inventory_uoms (lower(btrim(abbreviation)))
        WHERE NOT is_deleted
        """
    )
    _reference_table(_GM, "inventory_uoms")


def _create_tenant_inventory_uoms() -> None:
    op.create_table(
        "inventory_uoms",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("abbreviation", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_index("tm_idx_inventory_uoms_tenant", "inventory_uoms", ["iq_tenant_id"], schema=_TM)
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_uoms_name_active_key
        ON {_TM}.inventory_uoms (iq_tenant_id, lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_uoms_abbreviation_active_key
        ON {_TM}.inventory_uoms (iq_tenant_id, lower(btrim(abbreviation)))
        WHERE NOT is_deleted
        """
    )


def _create_global_inventory_manufacturers() -> None:
    op.create_table(
        "inventory_manufacturers",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=True),
        *_audit_columns(),
        schema=_GM,
    )
    _reference_table(_GM, "inventory_manufacturers")


def _create_tenant_inventory_manufacturers() -> None:
    op.create_table(
        "inventory_manufacturers",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=True),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_manufacturers_tenant",
        "inventory_manufacturers",
        ["iq_tenant_id"],
        schema=_TM,
    )


def _create_global_inventory_hsn_gst() -> None:
    op.create_table(
        "inventory_hsn_gst",
        _id_column(),
        sa.Column("hsn_code", sa.Text(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("cgst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("sgst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("igst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("supporting_document_url", sa.Text(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        *_audit_columns(),
        sa.CheckConstraint("hsn_code ~ '^\\d{4,8}$'", name="inventory_hsn_gst_hsn_code_format_chk"),
        sa.CheckConstraint(
            "cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0",
            name="inventory_hsn_gst_rates_non_negative_chk",
        ),
        sa.CheckConstraint(
            "remarks IS NULL OR char_length(remarks) <= 200",
            name="inventory_hsn_gst_remarks_max_length_chk",
        ),
        schema=_GM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_hsn_gst_code_effective_active_key
        ON {_GM}.inventory_hsn_gst (hsn_code, effective_from)
        WHERE NOT is_deleted
        """
    )
    _reference_table(_GM, "inventory_hsn_gst")


def _create_tenant_inventory_hsn_gst() -> None:
    op.create_table(
        "inventory_hsn_gst",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("hsn_code", sa.Text(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("cgst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("sgst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("igst_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("supporting_document_url", sa.Text(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        *_audit_columns(),
        sa.CheckConstraint(
            "hsn_code ~ '^\\d{4,8}$'",
            name="tm_inventory_hsn_gst_hsn_code_format_chk",
        ),
        sa.CheckConstraint(
            "cgst_pct >= 0 AND sgst_pct >= 0 AND igst_pct >= 0",
            name="tm_inventory_hsn_gst_rates_non_negative_chk",
        ),
        sa.CheckConstraint(
            "remarks IS NULL OR char_length(remarks) <= 200",
            name="tm_inventory_hsn_gst_remarks_max_length_chk",
        ),
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_hsn_gst_tenant",
        "inventory_hsn_gst",
        ["iq_tenant_id"],
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_hsn_gst_code_effective_active_key
        ON {_TM}.inventory_hsn_gst (iq_tenant_id, hsn_code, effective_from)
        WHERE NOT is_deleted
        """
    )


def _create_global_inventory_storage_conditions() -> None:
    op.create_table(
        "inventory_storage_conditions",
        _id_column(),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_GM,
    )
    _reference_table(_GM, "inventory_storage_conditions")


def _create_tenant_inventory_storage_conditions() -> None:
    op.create_table(
        "inventory_storage_conditions",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_storage_conditions_tenant",
        "inventory_storage_conditions",
        ["iq_tenant_id"],
        schema=_TM,
    )


def _create_global_inventory_store_types() -> None:
    op.create_table(
        "inventory_store_types",
        _id_column(),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("can_receive_stock", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_dispense", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_issue_to_ward", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("track_batch_expiry", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("indent_authority", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_indent_target_store_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_audit_columns(),
        schema=_GM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_store_types_code_active_key
        ON {_GM}.inventory_store_types (lower(btrim(code)))
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX inventory_store_types_name_active_key
        ON {_GM}.inventory_store_types (lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )
    op.create_index(
        "idx_inventory_store_types_active",
        "inventory_store_types",
        ["is_active"],
        schema=_GM,
    )
    _reference_table(_GM, "inventory_store_types")


def _create_tenant_inventory_store_types() -> None:
    op.create_table(
        "inventory_store_types",
        _id_column(),
        sa.Column("iq_tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("can_receive_stock", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_dispense", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_issue_to_ward", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("track_batch_expiry", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("indent_authority", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_indent_target_store_id", postgresql.UUID(as_uuid=True), nullable=True),
        *_audit_columns(),
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_store_types_tenant",
        "inventory_store_types",
        ["iq_tenant_id"],
        schema=_TM,
    )
    op.create_index(
        "tm_idx_inventory_store_types_tenant_active",
        "inventory_store_types",
        ["iq_tenant_id", "is_active"],
        schema=_TM,
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_store_types_code_active_key
        ON {_TM}.inventory_store_types (iq_tenant_id, lower(btrim(code)))
        WHERE NOT is_deleted
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX tm_inventory_store_types_name_active_key
        ON {_TM}.inventory_store_types (iq_tenant_id, lower(btrim(name)))
        WHERE NOT is_deleted
        """
    )


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_module(
    parent_slug: str | None,
    name: str,
    slug: str,
    description: str,
    category: str,
    level: int,
) -> None:
    parent_sql = "NULL"
    parent_exists_clause = ""
    if parent_slug is not None:
        parent_sql = f"""
            (SELECT id FROM global_master.modules
             WHERE slug = '{parent_slug}' AND NOT is_deleted
             LIMIT 1)
        """
        parent_exists_clause = f"""
          AND EXISTS (
              SELECT 1 FROM global_master.modules
              WHERE slug = '{parent_slug}' AND NOT is_deleted
          )
        """

    op.execute(
        f"""
        INSERT INTO global_master.modules (
            id, parent_id, name, slug, description, category, version, level, icon,
            is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            {parent_sql},
            '{_sql_literal(name)}',
            '{slug}',
            '{_sql_literal(description)}',
            '{category}',
            '1.0.0',
            {level},
            NULL,
            true,
            false,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM global_master.modules
            WHERE slug = '{slug}' AND NOT is_deleted
        )
          AND NOT EXISTS (
            SELECT 1 FROM global_master.modules
            WHERE name = '{_sql_literal(name)}' AND NOT is_deleted
        ){parent_exists_clause};
        """
    )


def _link_l3_crud_permissions(l3_slug: str) -> None:
    for permission_slug in _PERMISSION_SLUGS:
        op.execute(
            f"""
            INSERT INTO global_master.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                m.slug || ':' || '{permission_slug}',
                m.id,
                p.id,
                true,
                true,
                false,
                now(),
                now()
            FROM global_master.modules m
            CROSS JOIN global_master.permissions p
            WHERE m.slug = '{l3_slug}'
              AND m.level >= 3
              AND NOT m.is_deleted
              AND p.slug = '{permission_slug}'
              AND NOT p.is_deleted
              AND NOT EXISTS (
                  SELECT 1 FROM global_master.module_permissions mp
                  WHERE mp.slug = m.slug || ':' || '{permission_slug}'
                    AND NOT mp.is_deleted
              );
            """
        )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    _create_global_inventory_categories()
    _create_global_inventory_item_types()
    _create_global_inventory_uoms()
    _create_global_inventory_manufacturers()
    _create_global_inventory_hsn_gst()
    _create_global_inventory_storage_conditions()
    _create_global_inventory_store_types()

    op.execute(sa.text(f"CREATE SCHEMA IF NOT EXISTS {_TM}"))
    _create_tenant_inventory_categories()
    _create_tenant_inventory_item_types()
    _create_tenant_inventory_uoms()
    _create_tenant_inventory_manufacturers()
    _create_tenant_inventory_hsn_gst()
    _create_tenant_inventory_storage_conditions()
    _create_tenant_inventory_store_types()

    _insert_module(
        "master-data",
        "Inventory Master",
        "inventory-master",
        "Inventory reference catalogs (categories, UOMs, store types, HSN/GST, …).",
        "administrative",
        2,
    )
    for name, slug, description in _INVENTORY_L3_SEEDS:
        _insert_module("inventory-master", name, slug, description, "administrative", 3)
        _link_l3_crud_permissions(slug)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for _, slug, _ in reversed(_INVENTORY_L3_SEEDS):
        op.execute(
            f"""
            UPDATE global_master.module_permissions
            SET is_deleted = true, updated_at = now()
            WHERE slug LIKE '{slug}:%' AND NOT is_deleted;
            """
        )
        op.execute(
            f"""
            UPDATE global_master.modules
            SET is_deleted = true, updated_at = now()
            WHERE slug = '{slug}' AND NOT is_deleted;
            """
        )

    op.execute(
        """
        UPDATE global_master.module_permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug LIKE 'inventory-master:%' AND NOT is_deleted;
        """
    )
    op.execute(
        """
        UPDATE global_master.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug = 'inventory-master' AND NOT is_deleted;
        """
    )

    for table in (
        "inventory_store_types",
        "inventory_storage_conditions",
        "inventory_hsn_gst",
        "inventory_manufacturers",
        "inventory_uoms",
        "inventory_item_types",
        "inventory_categories",
    ):
        op.drop_table(table, schema=_TM)
        op.drop_table(table, schema=_GM)

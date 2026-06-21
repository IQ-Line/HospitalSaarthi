"""Seed platform picklist domains in ``master_global.picklist``.

Revision ID: 031_picklist_catalog_seed
Revises: 030_picklist_catalog

Idempotent inserts by ``slug``. Skipped on non-PostgreSQL (ORM create_all tests).

Each row sets ``name`` and ``slug`` explicitly in the seed tuples below.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "031_picklist_catalog_seed"
down_revision: str | Sequence[str] | None = "030_picklist_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (name, slug)
_PICKLIST_SEEDS: tuple[tuple[str, str], ...] = (
    ("Gender", "gender"),
    ("Blood Group", "blood-group"),
    ("Role Types", "role-types"),
    ("Nationality", "nationality"),
    ("Religion", "religion"),
    ("Tariff-type", "tariff-type"),
)


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def _insert_picklist(name: str, slug: str) -> None:
    op.execute(
        f"""
        INSERT INTO master_global.picklist (
            id, name, slug, is_active, is_deleted, created_by, updated_by,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            '{_sql_literal(name)}',
            '{slug}',
            true,
            false,
            NULL,
            NULL,
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM master_global.picklist
            WHERE slug = '{slug}' AND NOT is_deleted
        );
        """
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for name, slug in _PICKLIST_SEEDS:
        _insert_picklist(name, slug)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    slugs = ", ".join(f"'{slug}'" for _, slug in _PICKLIST_SEEDS)
    op.execute(
        f"""
        UPDATE master_global.picklist SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs}) AND NOT is_deleted;
        """
    )

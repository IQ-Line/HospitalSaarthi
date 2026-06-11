"""Seed ``opd_free_follow_up`` visit-types picklist value.

Revision ID: 041_opd_free_follow_up_picklist
Revises: 040_medicines_price

Idempotent insert by ``(category_id, value)``. Skipped on non-PostgreSQL.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "041_opd_free_follow_up_picklist"
down_revision: str | Sequence[str] | None = "040_medicines_price"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PICKLIST_SLUG = "visit-types"
_VALUE = "opd_free_follow_up"
_LABEL = "OPD — Free follow-up"
_DISPLAY_ORDER = 2


def _sql_literal(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        INSERT INTO global_master.picklist_values (
            id, category_id, value, label, description, metadata,
            is_active, is_global, display_order, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            p.id,
            '{_sql_literal(_VALUE)}',
            '{_sql_literal(_LABEL)}',
            NULL,
            NULL,
            true,
            false,
            {_DISPLAY_ORDER},
            now(),
            now()
        FROM global_master.picklist p
        WHERE p.slug = '{_PICKLIST_SLUG}'
          AND NOT p.is_deleted
          AND NOT EXISTS (
              SELECT 1 FROM global_master.picklist_values pv
              WHERE pv.category_id = p.id
                AND pv.value = '{_sql_literal(_VALUE)}'
          );
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        DELETE FROM global_master.picklist_values pv
        USING global_master.picklist p
        WHERE pv.category_id = p.id
          AND p.slug = '{_PICKLIST_SLUG}'
          AND NOT p.is_deleted
          AND pv.value = '{_sql_literal(_VALUE)}';
        """
    )

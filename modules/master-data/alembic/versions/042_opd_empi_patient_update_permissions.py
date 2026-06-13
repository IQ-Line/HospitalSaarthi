"""Add OPD and EMPI patient update permissions to the demo authorization catalog.

Revision ID: 042_opd_empi_patient_update_permissions
Revises: 041_merge_pharmacy_master_data_heads, 041_opd_free_follow_up_picklist

Runtime keys (via UM sync): ``opd:patient:update``, ``empi:patient:update``.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "042_opd_empi_patient_update_permissions"
down_revision: str | Sequence[str] | None = (
    "041_merge_pharmacy_master_data_heads",
    "041_opd_free_follow_up_picklist",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SEEDS: tuple[tuple[str, str, str, str, str], ...] = (
    (
        "c1000001-0004-4001-8001-000000000004",
        "opd.patient.update",
        "Update OPD patient",
        "update",
        "opd",
    ),
    (
        "f1000004-0003-4001-8001-000000000003",
        "empi.patient.update",
        "Update patient",
        "update",
        "empi",
    ),
)


def _esc(value: str) -> str:
    return value.replace("'", "''")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for perm_id, slug, name, action, module_slug in _PERMISSION_SEEDS:
        op.execute(
            f"""
            INSERT INTO global_master.permissions (
                id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
            )
            SELECT
                '{perm_id}'::uuid,
                '{_esc(name)}',
                '{slug}',
                '{action}',
                'Platform authorization catalog ({slug}).',
                true,
                false,
                now(),
                now()
            WHERE NOT EXISTS (
                SELECT 1 FROM global_master.permissions
                WHERE slug = '{slug}' AND NOT is_deleted
            );
            """
        )

        junction_slug = f"{module_slug}:{slug}"
        op.execute(
            f"""
            INSERT INTO global_master.module_permissions (
                id, slug, module_id, permission_id, is_default, is_active, is_deleted,
                created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                '{_esc(junction_slug)}',
                m.id,
                p.id,
                false,
                true,
                false,
                now(),
                now()
            FROM global_master.modules m
            INNER JOIN global_master.permissions p
              ON p.slug = '{slug}' AND NOT p.is_deleted
            WHERE m.slug = '{module_slug}' AND NOT m.is_deleted
              AND NOT EXISTS (
                SELECT 1 FROM global_master.module_permissions mp
                WHERE mp.slug = '{_esc(junction_slug)}'
                  AND NOT mp.is_deleted
              );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    perm_slugs = ", ".join(f"'{slug}'" for _, slug, _, _, _ in _PERMISSION_SEEDS)
    op.execute(
        f"""
        UPDATE global_master.module_permissions mp
        SET is_deleted = true, updated_at = now()
        FROM global_master.permissions p
        WHERE mp.permission_id = p.id
          AND p.slug IN ({perm_slugs})
          AND NOT mp.is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({perm_slugs}) AND NOT is_deleted;
        """
    )

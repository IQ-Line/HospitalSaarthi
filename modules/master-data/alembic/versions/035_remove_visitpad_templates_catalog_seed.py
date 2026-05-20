"""Remove previously seeded Visitpad templates catalog rows.

Revision ID: 035_remove_visitpad_templates_catalog_seed
Revises: 034_frontdesk_finance_modules_seed

Fresh databases no longer create these rows because revisions 024 and 025 are
no-op placeholders. This cleanup keeps already-migrated databases aligned.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "035_remove_visitpad_templates_catalog_seed"
down_revision: str | Sequence[str] | None = "034_frontdesk_finance_modules_seed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MODULE_SLUGS: tuple[str, ...] = ("visitpad-templates",)
_PERMISSION_SLUGS: tuple[str, ...] = (
    "visitpad-templates-catalog-read",
    "visitpad-templates-catalog-write",
    "visitpad-templates-catalog-manage",
)
_MODULE_PERMISSION_SLUGS: tuple[str, ...] = _PERMISSION_SLUGS


def _slug_list(slugs: tuple[str, ...]) -> str:
    return ", ".join(f"'{slug}'" for slug in slugs)


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute(
        f"""
        UPDATE global_master.module_permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({_slug_list(_MODULE_PERMISSION_SLUGS)})
          AND NOT is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.permissions
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({_slug_list(_PERMISSION_SLUGS)})
          AND NOT is_deleted;
        """
    )
    op.execute(
        f"""
        UPDATE global_master.modules
        SET is_deleted = true, updated_at = now()
        WHERE slug IN ({_slug_list(_MODULE_SLUGS)})
          AND NOT is_deleted;
        """
    )


def downgrade() -> None:
    return

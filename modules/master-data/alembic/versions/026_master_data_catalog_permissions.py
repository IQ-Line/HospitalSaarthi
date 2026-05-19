"""Seed Master Data catalog permissions (read, create, edit, delete) in ``global_master.permissions`` only.

Revision ID: 026_master_data_catalog_permissions
Revises: 025_visitpad_templates_catalog_manage

Idempotent inserts for fresh Postgres DBs. Skipped on non-PostgreSQL (ORM create_all tests).

Action mapping (DB ``permissions.action`` check constraint):
  - read  → ``read``
  - write → ``create`` (insert catalog rows)
  - edit   → ``update`` (modify catalog rows)
  - delete → ``delete`` (soft-delete catalog rows)

Link to ``modules`` via ``028`` (module_permissions for L2+).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "026_master_data_catalog_permissions"
down_revision: str | Sequence[str] | None = "025_visitpad_templates_catalog_manage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PERMISSION_SEEDS: tuple[tuple[str, str, str, str], ...] = (
    (
        "Read",
        "read",
        "read",
        "Read Master Data platform catalog rows.",
    ),
    (
        "Create",
        "create",
        "create",
        "Create Master Data platform catalog rows.",
    ),
    (
        "Edit",
        "edit",
        "update",
        "Update Master Data platform catalog rows.",
    ),
    (
        "Delete",
        "delete",
        "delete",
        "Soft-delete Master Data platform catalog rows.",
    ),
)


def _insert_permission(name: str, slug: str, action: str, description: str) -> None:
    op.execute(
        f"""
        INSERT INTO global_master.permissions (
            id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            '{name.replace("'", "''")}',
            '{slug}',
            '{action}',
            '{description.replace("'", "''")}',
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


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for name, slug, action, description in _PERMISSION_SEEDS:
        _insert_permission(name, slug, action, description)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    slugs = ", ".join(f"'{slug}'" for _, slug, _, _ in _PERMISSION_SEEDS)
    op.execute(
        f"""
        UPDATE global_master.permissions SET is_deleted = true, updated_at = now()
        WHERE slug IN ({slugs}) AND NOT is_deleted;
        """
    )

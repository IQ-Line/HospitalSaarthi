"""Convert ``master_tenant.*.tenant_id`` from UUID to integer (catalog tenant key).

Revision ID: 013_tm_tenant_id_int (≤32 chars for ``alembic_version.version_num``).
Revises: 012_tm_platform_catalog

**No-op (fresh local DB):** superseded by ``011`` / ``012`` creating ``iq_tenant_id`` as UUID directly.
Revision retained for Alembic chain continuity only.

SQLite / non-PostgreSQL: no-op.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "013_tm_tenant_id_int"
down_revision: str | Sequence[str] | None = "012_tm_platform_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return

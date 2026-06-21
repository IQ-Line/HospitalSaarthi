"""``master_tenant.*.iq_tenant_id``: integer → UUID (align with platform ``iq_tenant_id`` as UUID).

Revision ID: 022_tm_iq_tenant_uuid
Revises: 021_alembic_ver_num_128

**No-op (fresh local DB):** ``iq_tenant_id`` is UUID from ``011`` / ``012`` onward.
Revision retained for Alembic chain continuity only.

SQLite / non-PostgreSQL: no-op.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "022_tm_iq_tenant_uuid"
down_revision: str | Sequence[str] | None = "021_alembic_ver_num_128"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return

"""Widen ``alembic_version.version_num`` so revision IDs can exceed 32 characters safely.

Revision ID: 021_alembic_ver_num_128
Revises: 020_vp_disp_nm_audit_cols

PostgreSQL default Alembic installs ``version_num VARCHAR(32)``; longer ``revision`` strings fail on stamp.
We standardise on a wider column so naming stays descriptive.

SQLite / non-PostgreSQL: no-op.

"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op
from schema_names import GLOBAL_SCHEMA as _GM, TENANT_SCHEMA as _TM

revision: str = "021_alembic_ver_num_128"
down_revision: str | Sequence[str] | None = "020_vp_disp_nm_audit_cols"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute(
        text(
            f"ALTER TABLE {_GM}.alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute(
        text(
            f"""
            UPDATE {_GM}.alembic_version
            SET version_num = left(version_num, 32)
            WHERE char_length(version_num) > 32
            """
        )
    )
    op.execute(
        text(f"ALTER TABLE {_GM}.alembic_version ALTER COLUMN version_num TYPE VARCHAR(32)")
    )

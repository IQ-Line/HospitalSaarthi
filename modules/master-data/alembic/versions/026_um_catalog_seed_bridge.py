"""No-op bridge for databases stamped at legacy ``026_um_catalog_seed``.

Revision ID: 026_um_catalog_seed
Revises: 025_visitpad_templates_catalog_manage

The legacy migration that inserted into ``public.*`` was removed. This empty revision
keeps Alembic history coherent for existing developer databases. Fresh installs should
reach ``027`` via ``026_master_data_catalog_permissions`` only (merge below).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "026_um_catalog_seed"
down_revision: str | Sequence[str] | None = "025_visitpad_templates_catalog_manage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

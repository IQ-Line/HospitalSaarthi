"""No-op placeholder for the removed Visitpad templates catalog seed.

Revision ID: 024_visitpad_templates_module_catalog
Revises: 023_vp_vaccines_manufacturers

This revision is intentionally kept so the Alembic chain remains stable.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "024_visitpad_templates_module_catalog"
down_revision: str | Sequence[str] | None = "023_vp_vaccines_manufacturers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return

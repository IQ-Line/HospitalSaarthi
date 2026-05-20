"""No-op placeholder for the removed Visitpad templates manage seed.

Revision ID: 025_visitpad_templates_catalog_manage
Revises: 024_visitpad_templates_module_catalog

This revision is intentionally kept so the Alembic chain remains stable.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "025_visitpad_templates_catalog_manage"
down_revision: str | Sequence[str] | None = "024_visitpad_templates_module_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    return


def downgrade() -> None:
    return

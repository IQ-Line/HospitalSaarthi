"""Merge OPD prescription migration heads.

Revision ID: 003_merge_opd_prescription_heads
Revises: 002_health_documents, 0003_prescription_form_data

Unifies the normalized prescription schema branch (``001`` → ``002_health_documents``)
with the incremental column branch (``001`` → ``0002_rx_doctor_vitals`` → ``0003``).

Always run ``alembic upgrade heads`` (plural). ``upgrade head`` (singular) can apply
only one branch and leave ``opd.health_documents`` missing on databases that followed
the ``0003`` line first.
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "003_merge_opd_prescription_heads"
down_revision: str | Sequence[str] | None = (
    "002_health_documents",
    "0003_prescription_form_data",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

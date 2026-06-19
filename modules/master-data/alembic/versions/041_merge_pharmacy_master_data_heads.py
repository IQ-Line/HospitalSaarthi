"""Merge master-data Alembic heads after pharmacy catalog work.

Revision ID: 041_merge_pharmacy_master_data_heads
Revises: 040_medicines_price, 040_pharmacy_catalog, 026_departments_catalog

``040_medicines_price`` and ``040_pharmacy_catalog`` both revise ``039``; they touch
different tables and can coexist. ``026_departments_catalog`` is a pre-existing orphan
from ``025`` — merged here so ``alembic upgrade head`` succeeds.
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "041_merge_pharmacy_master_data_heads"
down_revision: str | Sequence[str] | None = (
    "040_medicines_price",
    "040_pharmacy_catalog",
    "026_departments_catalog",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

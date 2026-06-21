"""Shared column mixins for prescription ORM models.

Tenant column convention (Citus distribution key): the Python ORM attribute is
``tenant_id`` but the physical/SQLAlchemy column key is ``iq_tenant_id`` (canonical,
per D4). So reference it as ``tenant_id`` in ORM attribute access
(``Model.tenant_id``, ``Model(tenant_id=...)``) but as ``"iq_tenant_id"`` in
``__table_args__`` (Index / ForeignKeyConstraint / UniqueConstraint) and raw SQL,
because those resolve against the column key.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column


class TenantScopedMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        "iq_tenant_id", Uuid(as_uuid=True), nullable=False, index=True
    )


class TenantPrimaryKeyMixin:
    """Citus distribution key is part of the primary key."""

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        "iq_tenant_id", Uuid(as_uuid=True), primary_key=True, nullable=False
    )


class LineItemMixin(TenantPrimaryKeyMixin):
    line_no: Mapped[int] = mapped_column(nullable=False)

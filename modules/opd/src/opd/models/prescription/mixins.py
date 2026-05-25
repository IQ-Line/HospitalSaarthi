"""Shared column mixins for prescription ORM models."""

from __future__ import annotations

import uuid

from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column


class TenantScopedMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)


class TenantPrimaryKeyMixin:
    """Citus distribution key is part of the primary key."""

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, nullable=False)


class LineItemMixin(TenantPrimaryKeyMixin):
    line_no: Mapped[int] = mapped_column(nullable=False)

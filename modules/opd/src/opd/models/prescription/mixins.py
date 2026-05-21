"""Shared column mixins for prescription ORM models."""

from __future__ import annotations

import uuid

from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column


class TenantScopedMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)


class LineItemMixin(TenantScopedMixin):
    line_no: Mapped[int] = mapped_column(nullable=False)

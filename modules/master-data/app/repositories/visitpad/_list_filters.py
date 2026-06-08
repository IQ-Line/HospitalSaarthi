"""Shared filters for Visitpad catalog list queries."""

from __future__ import annotations

from typing import Any


def append_is_active_filter(filters: list[Any], model: Any, is_active: bool | None) -> None:
    if is_active is not None:
        filters.append(model.is_active.is_(is_active))

"""Paged list: ``COUNT(*) OVER()`` with page rows (one DB round-trip when rows exist)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import Select
from sqlalchemy.orm import Session


def fetch_page_with_window_total(
    session: Session,
    *,
    page_stmt: Select[tuple[Any, Any]],
    empty_total_stmt: Select[tuple[int]],
) -> tuple[list[Any], int]:
    """Run ``page_stmt`` (entity + window count); ``total`` from first row."""
    rows = session.execute(page_stmt).unique().all()
    if not rows:
        total = int(session.scalar(empty_total_stmt) or 0)
        return [], total
    total = int(rows[0][1])
    return [r[0] for r in rows], total

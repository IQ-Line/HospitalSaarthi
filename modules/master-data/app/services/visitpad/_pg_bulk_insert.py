"""PostgreSQL-only multi-row INSERT … ON CONFLICT DO NOTHING for Visitpad tenant imports."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session


def session_is_postgresql(session: Session) -> bool:
    bind = session.get_bind()
    return bind is not None and bind.dialect.name == "postgresql"


def pg_bulk_insert_ignore_returning(
    session: Session,
    model: type[Any],
    rows: list[dict[str, Any]],
    *,
    index_elements: Sequence[str],
    index_where: Any | None = None,
    returning_cols: Sequence[Any],
) -> list[Any]:
    """Insert many rows; skip conflicts on the partial unique index; return RETURNING rows."""
    if not rows:
        return []
    stmt = pg_insert(model).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=list(index_elements), index_where=index_where)
    stmt = stmt.returning(*returning_cols)
    return list(session.execute(stmt).all())


def utc_now_pair() -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    return now, now

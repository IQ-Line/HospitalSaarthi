"""Date/time primitives — IST clock + FHIR-format helpers.

Per ADR-0023 / the bundle-builder discipline, all "now" timestamps go through
an injectable clock so bundles are snapshot-stable in tests. The default clock
is ``datetime.now(IST)``.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone

# Indian Standard Time (UTC+05:30) — the canonical clinical timezone.
IST = timezone(timedelta(hours=5, minutes=30))

# A zero-arg callable returning the current ``datetime`` (tz-aware).
Clock = Callable[[], datetime]


def default_clock() -> datetime:
    """Return the current time in IST (tz-aware)."""
    return datetime.now(IST)


def to_fhir_datetime(dt: datetime) -> str:
    """Format a ``datetime`` as a FHIR ``dateTime`` with offset.

    Produces ISO 8601 with seconds precision and a colon in the offset, e.g.
    ``2026-06-12T10:00:00+05:30``. A naive datetime is assumed to be IST.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt.isoformat(timespec="seconds")


def safe_birth_date(value: str | date | None) -> str | None:
    """Coerce a birth date to ``YYYY-MM-DD``, or ``None`` if unparseable.

    Never raises. Accepts a ``date``/``datetime``, an ISO date string, or a
    full ISO datetime string (the date portion is taken).
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            # Tolerate full datetimes and a trailing "Z".
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return parsed.date().isoformat()
        except ValueError:
            try:
                return date.fromisoformat(text[:10]).isoformat()
            except ValueError:
                return None
    return None

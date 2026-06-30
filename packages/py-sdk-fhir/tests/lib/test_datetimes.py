"""Unit tests for datetime primitives."""

from __future__ import annotations

from datetime import UTC, date, datetime

from hims_sdk_fhir.lib import IST, default_clock, safe_birth_date, to_fhir_datetime


def test_ist_is_utc_plus_530() -> None:
    assert IST.utcoffset(None).total_seconds() == 5.5 * 3600


def test_default_clock_is_ist_aware() -> None:
    now = default_clock()
    assert now.tzinfo is not None
    assert now.utcoffset() == IST.utcoffset(None)


def test_to_fhir_datetime_seconds_precision_with_colon_offset() -> None:
    dt = datetime(2026, 6, 12, 10, 0, 0, tzinfo=IST)
    assert to_fhir_datetime(dt) == "2026-06-12T10:00:00+05:30"


def test_to_fhir_datetime_truncates_microseconds() -> None:
    dt = datetime(2026, 6, 12, 10, 0, 0, 123456, tzinfo=IST)
    assert to_fhir_datetime(dt) == "2026-06-12T10:00:00+05:30"


def test_to_fhir_datetime_assumes_ist_for_naive() -> None:
    dt = datetime(2026, 6, 12, 10, 0, 0)
    assert to_fhir_datetime(dt) == "2026-06-12T10:00:00+05:30"


def test_to_fhir_datetime_preserves_other_offsets() -> None:
    dt = datetime(2026, 6, 12, 10, 0, 0, tzinfo=UTC)
    assert to_fhir_datetime(dt) == "2026-06-12T10:00:00+00:00"


def test_safe_birth_date_from_iso_string() -> None:
    assert safe_birth_date("1990-05-08") == "1990-05-08"


def test_safe_birth_date_from_datetime_string() -> None:
    assert safe_birth_date("1990-05-08T12:34:56+05:30") == "1990-05-08"


def test_safe_birth_date_from_z_datetime() -> None:
    assert safe_birth_date("1990-05-08T12:34:56Z") == "1990-05-08"


def test_safe_birth_date_from_date_object() -> None:
    assert safe_birth_date(date(1990, 5, 8)) == "1990-05-08"


def test_safe_birth_date_from_datetime_object() -> None:
    assert safe_birth_date(datetime(1990, 5, 8, 1, 2, 3)) == "1990-05-08"


def test_safe_birth_date_returns_none_for_none() -> None:
    assert safe_birth_date(None) is None


def test_safe_birth_date_returns_none_for_garbage() -> None:
    assert safe_birth_date("not-a-date") is None
    assert safe_birth_date("") is None
    assert safe_birth_date("   ") is None


def test_safe_birth_date_never_raises_on_weird_input() -> None:
    # Year-only / partial strings degrade to None rather than raising.
    assert safe_birth_date("13/45/9999") is None

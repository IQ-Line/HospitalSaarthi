"""Unit tests for the UUID factory primitive."""

from __future__ import annotations

import uuid

from hims_sdk_fhir.lib import default_uuid_factory


def test_default_factory_returns_valid_uuid_string() -> None:
    value = default_uuid_factory()
    assert isinstance(value, str)
    # Parses as a UUID and is urn-less.
    parsed = uuid.UUID(value)
    assert str(parsed) == value
    assert not value.startswith("urn:")


def test_default_factory_returns_fresh_values() -> None:
    assert default_uuid_factory() != default_uuid_factory()


def test_injected_counter_factory_is_deterministic(uuid_factory) -> None:
    assert uuid_factory() == "00000000-0000-0000-0000-000000000001"
    assert uuid_factory() == "00000000-0000-0000-0000-000000000002"

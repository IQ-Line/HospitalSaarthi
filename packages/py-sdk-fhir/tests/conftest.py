"""Shared pytest fixtures — deterministic UUID factory + fixed clock.

These make bundles snapshot-stable. Later waves (resource builders, HI-Type
composers) reuse these fixtures to assert byte-stable output.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

import pytest

from hims_sdk_fhir.lib import IST


@pytest.fixture
def uuid_factory() -> Callable[[], str]:
    """A deterministic counter-based UUID factory.

    Produces ``00000000-0000-0000-0000-000000000001``, ``...002``, … on each
    call, incrementing per invocation. Returns the callable.
    """
    counter = {"n": 0}

    def factory() -> str:
        counter["n"] += 1
        return f"00000000-0000-0000-0000-{counter['n']:012d}"

    return factory


@pytest.fixture
def clock() -> Callable[[], datetime]:
    """A fixed clock returning ``2026-06-12T10:00:00+05:30`` on every call."""

    def fixed() -> datetime:
        return datetime(2026, 6, 12, 10, 0, 0, tzinfo=IST)

    return fixed

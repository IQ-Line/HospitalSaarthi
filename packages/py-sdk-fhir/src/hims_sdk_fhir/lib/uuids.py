"""UUID factory primitive — injectable for deterministic-testable builders.

Per ADR-0023 / the bundle-builder discipline, all UUID generation goes through
an injectable factory so bundles are snapshot-stable in tests. A factory is a
zero-arg callable returning a fresh, urn-less UUID string.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

import uuid
from collections.abc import Callable

# A zero-arg callable returning a fresh, urn-less UUID string.
UuidFactory = Callable[[], str]


def default_uuid_factory() -> str:
    """Return a fresh random UUIDv4 as a bare (urn-less) string."""
    return str(uuid.uuid4())

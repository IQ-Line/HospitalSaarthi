"""Canonical JSON serialisation — deterministic, signing-stable output.

Mirrors the intent of ``packages/ts-sdk-fhir/src/canonical-json.ts`` (RFC
8785 / JCS): sorted keys, no insignificant whitespace, stable byte output for
snapshot/canonical needs. We rely on the stdlib ``json`` encoder with
``sort_keys`` + compact separators, which is sufficient for our snapshot and
canonicalisation requirements.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://www.rfc-editor.org/rfc/rfc8785
"""

from __future__ import annotations

import json
from typing import Any


def canonical_json(obj: Any) -> str:
    """Serialise ``obj`` to deterministic JSON (sorted keys, no whitespace)."""
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )

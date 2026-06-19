"""Builder primitives for the FHIR bundle composers.

Pure, side-effect-free helpers (UUIDs, clocks, narratives, reference rewriting,
canonical JSON, compaction) shared by the resource builders and HI-Type
composers.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from __future__ import annotations

from .canonical_json import canonical_json
from .compact import compact
from .datetimes import IST, Clock, default_clock, safe_birth_date, to_fhir_datetime
from .narrative import escape_xml, generated_narrative
from .references import build_reference_map, rewrite_references_in_place
from .uuids import UuidFactory, default_uuid_factory

__all__ = [
    "IST",
    "Clock",
    "UuidFactory",
    "build_reference_map",
    "canonical_json",
    "compact",
    "default_clock",
    "default_uuid_factory",
    "escape_xml",
    "generated_narrative",
    "rewrite_references_in_place",
    "safe_birth_date",
    "to_fhir_datetime",
]

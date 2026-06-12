"""``build_composition`` — Layer-1 Composition resource builder.

Python mirror of ts ``buildComposition``: stamps ``meta.profile`` as
``f"{canonical_url}|{version}"`` from ``NRCES_PROFILES``, defaults ``status``
to ``final``, and emits a generated narrative from ``title``.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/composition.html
"""

from __future__ import annotations

from ..lib import compact, generated_narrative
from ..profile_registry import NRCES_PROFILES
from ..types import (
    Composition,
    CompositionSection,
    FhirCodeableConcept,
    FhirIdentifier,
    FhirReference,
)


def build_composition(
    *,
    profile: str,
    type: FhirCodeableConcept,
    subject: FhirReference,
    author: list[FhirReference],
    date: str,
    title: str,
    sections: list[CompositionSection],
    encounter: FhirReference | None = None,
    identifier: FhirIdentifier | None = None,
    status: str = "final",
    custodian: FhirReference | None = None,
) -> Composition:
    """Build a ``Composition`` resource for the given NRCeS ``profile`` key."""
    pinned = NRCES_PROFILES[profile]

    composition: Composition = {
        "resourceType": "Composition",
        "meta": {"profile": [f"{pinned.canonical_url}|{pinned.version}"]},
        "status": status,
        "type": type,
        "subject": subject,
        "date": date,
        "author": author,
        "title": title,
        "section": sections,
        "text": generated_narrative(title),
    }

    if identifier is not None:
        composition["identifier"] = identifier
    if encounter is not None:
        composition["encounter"] = encounter
    if custodian is not None:
        composition["custodian"] = custodian

    return compact(composition)

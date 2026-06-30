"""``build_health_document_bundle`` — Layer-2 Health Document Bundle composer.

Composes a complete NRCeS ``HealthDocumentRecord`` FHIR R4 Document Bundle
(SNOMED ``419891008`` "Record artifact"), mirroring legacy ``bundle.js``
``buildHealthDocumentBundle``: a single ``DocumentReference`` (its ``created``
defaulting to ``now``), the Patient, an optional author Practitioner, and the
Encounter, with one Composition section referencing the DocumentReference.

The composition title is the document's ``title`` (legacy fell back to "Health
Document" when absent; ``DocumentInput.title`` is required here so the title is
always present).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see docs/superpowers/specs/2026-06-12-py-sdk-fhir-bundle-builders-design.md §12
"""

from __future__ import annotations

from ..builders import (
    build_composition,
    build_document_bundle,
    build_encounter,
    build_organization,
    build_patient,
    build_practitioner,
)
from ..inputs import HealthDocumentInput
from ..lib import (
    Clock,
    UuidFactory,
    default_clock,
    default_uuid_factory,
    to_fhir_datetime,
)
from ..types import Bundle, FhirReference, FhirResource
from .common import (
    composition_type,
    document_reference_with_default_created,
    reference,
    signature,
    stamp_document_bundle_meta,
)

_SNOMED_CODE = "419891008"
_SNOMED_DISPLAY = "Record artifact"
_DEFAULT_TITLE = "Health Document"


def build_health_document_bundle(
    inp: HealthDocumentInput,
    *,
    uuid_factory: UuidFactory = default_uuid_factory,
    clock: Clock = default_clock,
) -> Bundle:
    """Compose a Health Document FHIR R4 Document Bundle from ``inp``."""
    now = to_fhir_datetime(clock())

    patient_id = uuid_factory()
    encounter_id = uuid_factory()
    document_id = uuid_factory()

    patient_ref = reference(f"Patient/{patient_id}", "Patient")
    encounter_ref = reference(f"Encounter/{encounter_id}", "Encounter")

    entries: list[FhirResource] = []

    patient = build_patient(inp.patient, resource_id=patient_id)
    encounter = build_encounter(
        inp.encounter, resource_id=encounter_id, subject=patient_ref, now=now
    )
    entries.extend([encounter, patient])

    # Author practitioner is optional for Health Documents.
    author_ref: FhirReference | None = None
    author_id: str | None = None
    if inp.author is not None:
        author_id = uuid_factory()
        entries.append(build_practitioner(inp.author, resource_id=author_id))
        author_ref = reference(f"Practitioner/{author_id}", "Practitioner")

    organization_ref: FhirReference | None = None
    if inp.organization is not None:
        organization_id = uuid_factory()
        entries.append(build_organization(inp.organization, resource_id=organization_id))
        organization_ref = reference(f"Organization/{organization_id}", "Organization")

    entries.append(
        document_reference_with_default_created(
            inp.document, resource_id=document_id, subject=patient_ref, now=now
        )
    )

    title = inp.document.title or _DEFAULT_TITLE
    sections = [
        {
            "title": title,
            "entry": [reference(f"DocumentReference/{document_id}", "DocumentReference")],
        }
    ]

    comp = build_composition(
        profile="HealthDocumentRecord",
        type=composition_type(_SNOMED_CODE, _SNOMED_DISPLAY),
        subject=patient_ref,
        encounter=encounter_ref,
        author=[author_ref] if author_ref is not None else [],
        date=now,
        title=title,
        sections=sections,
        custodian=organization_ref,
    )

    bundle = build_document_bundle(
        composition=comp,
        entries=entries,
        uuid_factory=uuid_factory,
        clock=clock,
        meta=None,
    )
    stamp_document_bundle_meta(bundle)

    if inp.signature_base64 is not None and author_id is not None:
        bundle["signature"] = signature(
            signature_base64=inp.signature_base64, when=now, who_id=author_id
        )

    return bundle

"""``build_prescription_bundle`` — Layer-2 Prescription Document Bundle composer.

Composes a complete NRCeS ``PrescriptionRecord`` FHIR R4 Document Bundle
(SNOMED ``440545006`` "Prescription record"), mirroring legacy ``bundle.js``
``buildPrescriptionBundle``: Conditions from diagnoses, MedicationRequests from
medicines, an optional ``Binary`` carrying the PDF, all referenced from a single
``Medication`` section. Each MedicationRequest's ``reasonReference`` points to the
first diagnosis Condition when present.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see docs/superpowers/specs/2026-06-12-py-sdk-fhir-bundle-builders-design.md §12
"""

from __future__ import annotations

from ..builders import (
    build_composition,
    build_condition,
    build_document_bundle,
    build_encounter,
    build_medication_request,
    build_organization,
    build_patient,
    build_practitioner,
)
from ..inputs import PrescriptionInput
from ..lib import (
    Clock,
    UuidFactory,
    compact,
    default_clock,
    default_uuid_factory,
    to_fhir_datetime,
)
from ..profile_registry import resource_profile
from ..types import Bundle, CompositionSection, FhirReference, FhirResource
from .common import (
    SNOMED_SYSTEM,
    composition_type,
    reference,
    signature,
    stamp_document_bundle_meta,
)

_SNOMED_CODE = "440545006"
_SNOMED_DISPLAY = "Prescription record"
_TITLE = "Prescription record"

_MEDICATION_SECTION_CODE = {
    "coding": [{"system": SNOMED_SYSTEM, "code": _SNOMED_CODE, "display": _SNOMED_DISPLAY}],
    "text": "Medication",
}


def build_prescription_bundle(
    inp: PrescriptionInput,
    *,
    uuid_factory: UuidFactory = default_uuid_factory,
    clock: Clock = default_clock,
) -> Bundle:
    """Compose a Prescription FHIR R4 Document Bundle from ``inp``."""
    now = to_fhir_datetime(clock())

    patient_id = uuid_factory()
    practitioner_id = uuid_factory()
    encounter_id = uuid_factory()

    patient_ref = reference(f"Patient/{patient_id}", "Patient")
    practitioner_ref = reference(f"Practitioner/{practitioner_id}", "Practitioner")
    encounter_ref = reference(f"Encounter/{encounter_id}", "Encounter")

    entries: list[FhirResource] = []

    patient = build_patient(inp.patient, resource_id=patient_id)
    practitioner = build_practitioner(inp.practitioner, resource_id=practitioner_id)
    encounter = build_encounter(
        inp.encounter, resource_id=encounter_id, subject=patient_ref, now=now
    )
    entries.extend([encounter, patient, practitioner])

    organization_ref: FhirReference | None = None
    if inp.organization is not None:
        organization_id = uuid_factory()
        entries.append(build_organization(inp.organization, resource_id=organization_id))
        organization_ref = reference(f"Organization/{organization_id}", "Organization")

    # Conditions from diagnoses. The first one is used as MedicationRequest reason.
    first_condition_ref: FhirReference | None = None
    for index, diagnosis in enumerate(inp.diagnoses):
        cond_id = uuid_factory()
        entries.append(
            build_condition(
                resource_id=cond_id,
                text=diagnosis.text,
                subject=patient_ref,
                certainty=diagnosis.certainty,
                recorded_date=now,
            )
        )
        if index == 0:
            first_condition_ref = reference(f"Condition/{cond_id}", "Condition")

    section_entries: list[FhirReference] = []

    # MedicationRequests (the prescription proper).
    for medicine in inp.medicines:
        med_id = uuid_factory()
        entries.append(
            build_medication_request(
                medicine,
                resource_id=med_id,
                subject=patient_ref,
                requester=practitioner_ref,
                authored_on=now,
                reason_reference=first_condition_ref,
            )
        )
        section_entries.append(reference(f"MedicationRequest/{med_id}", "MedicationRequest"))

    # Optional PDF rendering as a Binary resource.
    if inp.pdf_base64 is not None:
        binary_id = uuid_factory()
        binary: FhirResource = compact(
            {
                "resourceType": "Binary",
                "id": binary_id,
                "meta": {"profile": [resource_profile("Binary")]},
                "contentType": "application/pdf",
                "data": inp.pdf_base64,
            }
        )
        entries.append(binary)
        section_entries.append(reference(f"Binary/{binary_id}", "Binary"))

    sections: list[CompositionSection] = []
    if section_entries:
        sections.append(
            {"title": "Medication", "code": _MEDICATION_SECTION_CODE, "entry": section_entries}
        )

    comp = build_composition(
        profile="Prescription",
        type=composition_type(_SNOMED_CODE, _SNOMED_DISPLAY),
        subject=patient_ref,
        encounter=encounter_ref,
        author=[practitioner_ref],
        date=now,
        title=_TITLE,
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

    if inp.signature_base64 is not None:
        bundle["signature"] = signature(
            signature_base64=inp.signature_base64, when=now, who_id=practitioner_id
        )

    return bundle

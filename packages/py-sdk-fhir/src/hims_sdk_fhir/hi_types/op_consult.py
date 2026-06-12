"""``build_op_consult_bundle`` — Layer-2 OP Consultation Document Bundle composer.

Composes the 14 Wave-B resource builders into a complete NRCeS ``OPConsultRecord``
FHIR R4 Document Bundle (SNOMED ``371530004`` "Clinical consultation report").

Section composition mirrors legacy ``bundle.js`` ``buildOpConsultBundle`` for the
named sections only: Chief complaints, Vital Signs, Diagnosis, Allergies,
Medications, and an optional Document Reference. Empty sections are omitted.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see docs/superpowers/specs/2026-06-12-py-sdk-fhir-bundle-builders-design.md §12
"""

from __future__ import annotations

from ..builders import (
    build_allergy_intolerance,
    build_composition,
    build_condition,
    build_document_bundle,
    build_encounter,
    build_medication_request,
    build_organization,
    build_patient,
    build_practitioner,
    build_vital_observations,
)
from ..inputs import OpConsultInput
from ..lib import (
    Clock,
    UuidFactory,
    default_clock,
    default_uuid_factory,
    to_fhir_datetime,
)
from ..types import Bundle, CompositionSection, FhirReference, FhirResource
from .common import (
    SNOMED_SYSTEM,
    composition_type,
    document_reference_with_default_created,
    reference,
    signature,
    stamp_document_bundle_meta,
)

_SNOMED_CODE = "371530004"
_SNOMED_DISPLAY = "Clinical consultation report"
_TITLE = "Consultation Report"

# Section codes (mirrors legacy bundle.js addSection calls).
_CHIEF_COMPLAINTS_CODE = {
    "coding": [
        {"system": SNOMED_SYSTEM, "code": "422843007", "display": "Chief complaint section"}
    ],
    "text": "Chief complaints",
}
_ALLERGIES_CODE = {
    "coding": [{"system": SNOMED_SYSTEM, "code": "722446000", "display": "Allergy record"}],
    "text": "Allergies",
}
_MEDICATIONS_CODE = {
    "coding": [
        {"system": SNOMED_SYSTEM, "code": "721912009", "display": "Medication summary document"}
    ],
    "text": "Medications",
}
_DOCUMENT_CODE = {
    "coding": [{"system": SNOMED_SYSTEM, "code": _SNOMED_CODE, "display": _SNOMED_DISPLAY}],
    "text": "Document Reference",
}


def build_op_consult_bundle(
    inp: OpConsultInput,
    *,
    uuid_factory: UuidFactory = default_uuid_factory,
    clock: Clock = default_clock,
) -> Bundle:
    """Compose an OP Consultation FHIR R4 Document Bundle from ``inp``."""
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
        organization = build_organization(inp.organization, resource_id=organization_id)
        organization_ref = reference(f"Organization/{organization_id}", "Organization")
        entries.append(organization)

    sections: list[CompositionSection] = []

    # Chief complaints (Conditions).
    chief_entries: list[FhirReference] = []
    for complaint in inp.chief_complaints:
        cond_id = uuid_factory()
        entries.append(
            build_condition(
                resource_id=cond_id,
                text=complaint.text,
                subject=patient_ref,
                recorded_date=now,
            )
        )
        chief_entries.append(reference(f"Condition/{cond_id}", "Condition"))
    if chief_entries:
        sections.append(
            {"title": "Chief complaints", "code": _CHIEF_COMPLAINTS_CODE, "entry": chief_entries}
        )

    # Vital signs (Observations via the fan-out builder; owns its own ids).
    vital_observations = build_vital_observations(
        legacy=inp.legacy_vitals,
        vitals=inp.vitals,
        subject=patient_ref,
        now=now,
        uuid_factory=uuid_factory,
    )
    if vital_observations:
        vital_entries: list[FhirReference] = []
        for obs in vital_observations:
            entries.append(obs)
            vital_entries.append(reference(f"Observation/{obs['id']}", "Observation"))
        sections.append(
            {"title": "Vital Signs", "code": {"text": "Vital Signs"}, "entry": vital_entries}
        )

    # Diagnosis (Conditions).
    diagnosis_entries: list[FhirReference] = []
    for diagnosis in inp.diagnoses:
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
        diagnosis_entries.append(reference(f"Condition/{cond_id}", "Condition"))
    if diagnosis_entries:
        sections.append(
            {"title": "Diagnosis", "code": {"text": "Diagnosis"}, "entry": diagnosis_entries}
        )

    # Allergies (use the "no known allergies" sentinel when none given).
    allergy_entries: list[FhirReference] = []
    allergy_inputs = list(inp.allergies) or [None]
    for allergy in allergy_inputs:
        allergy_id = uuid_factory()
        entries.append(
            build_allergy_intolerance(
                allergy,
                resource_id=allergy_id,
                patient=patient_ref,
                recorder=practitioner_ref,
                recorded_date=now,
            )
        )
        allergy_entries.append(reference(f"AllergyIntolerance/{allergy_id}", "AllergyIntolerance"))
    sections.append({"title": "Allergies", "code": _ALLERGIES_CODE, "entry": allergy_entries})

    # Medications (MedicationRequests).
    medication_entries: list[FhirReference] = []
    for medicine in inp.medicines:
        med_id = uuid_factory()
        entries.append(
            build_medication_request(
                medicine,
                resource_id=med_id,
                subject=patient_ref,
                requester=practitioner_ref,
                authored_on=now,
            )
        )
        medication_entries.append(reference(f"MedicationRequest/{med_id}", "MedicationRequest"))
    if medication_entries:
        sections.append(
            {"title": "Medications", "code": _MEDICATIONS_CODE, "entry": medication_entries}
        )

    # Optional supporting document.
    if inp.document is not None:
        doc_id = uuid_factory()
        entries.append(
            document_reference_with_default_created(
                inp.document, resource_id=doc_id, subject=patient_ref, now=now
            )
        )
        sections.append(
            {
                "title": "Document Reference",
                "code": _DOCUMENT_CODE,
                "entry": [reference(f"DocumentReference/{doc_id}", "DocumentReference")],
            }
        )

    comp = build_composition(
        profile="OpConsultRecord",
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

"""``build_immunization_bundle`` — Layer-2 Immunization Document Bundle composer.

Composes a complete NRCeS ``ImmunizationRecord`` FHIR R4 Document Bundle
(SNOMED ``41000179103`` "Immunization record"), mirroring legacy ``bundle.js``
``buildImmunizationBundle``: one ``Immunization`` per input, an
``ImmunizationRecommendation`` for any with a ``next_due_date``, optional
deduplicated manufacturer Organizations and administering-Practitioners, and an
optional supporting document — all referenced from a single section.

Manufacturers are deduplicated by name; performers (administering practitioners)
by ``registration_id`` (falling back to ``full_name`` when absent) so a shared
manufacturer or performer becomes one entry referenced by multiple Immunizations.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see docs/superpowers/specs/2026-06-12-py-sdk-fhir-bundle-builders-design.md §12
"""

from __future__ import annotations

from ..builders import (
    build_composition,
    build_document_bundle,
    build_encounter,
    build_immunization,
    build_organization,
    build_patient,
    build_practitioner,
)
from ..inputs import (
    ImmunizationBundleInput,
    ImmunizationInput,
    OrganizationInput,
    PractitionerInput,
)
from ..lib import (
    Clock,
    UuidFactory,
    compact,
    default_clock,
    default_uuid_factory,
    to_fhir_datetime,
)
from ..profile_registry import resource_profile
from ..types import Bundle, FhirReference, FhirResource
from .common import (
    composition_type,
    document_reference_with_default_created,
    reference,
    signature,
    stamp_document_bundle_meta,
)

_SNOMED_CODE = "41000179103"
_SNOMED_DISPLAY = "Immunization record"
_TITLE = "Immunization record"


def _performer_key(practitioner: PractitionerInput) -> str:
    """Dedup key for an administering practitioner."""
    return practitioner.registration_id or f"name:{practitioner.full_name}"


def _build_recommendation(
    *,
    resource_id: str,
    inp: ImmunizationInput,
    patient_ref: FhirReference,
    immunization_ref: FhirReference,
    now: str,
    authority: FhirReference | None,
) -> FhirResource:
    """Build an ``ImmunizationRecommendation`` for a forecast ``next_due_date``."""
    date_criterion: dict = {"code": {"text": "Date vaccine due"}}
    if inp.next_due_date:
        date_criterion["value"] = inp.next_due_date
    recommendation: FhirResource = {
        "resourceType": "ImmunizationRecommendation",
        "id": resource_id,
        "meta": {"profile": [resource_profile("ImmunizationRecommendation")]},
        "patient": patient_ref,
        "date": now,
        "recommendation": [
            {
                "vaccineCode": [{"text": inp.vaccine_name}],
                "forecastStatus": {"text": "Due"},
                "dateCriterion": [date_criterion],
                "supportingImmunization": [immunization_ref],
            }
        ],
    }
    if authority is not None:
        recommendation["authority"] = authority
    return compact(recommendation)


def build_immunization_bundle(
    inp: ImmunizationBundleInput,
    *,
    uuid_factory: UuidFactory = default_uuid_factory,
    clock: Clock = default_clock,
) -> Bundle:
    """Compose an Immunization FHIR R4 Document Bundle from ``inp``."""
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

    # Dedup maps: manufacturer by name, performer by registration/name. The
    # primary author practitioner is pre-seeded so it is reused as performer.
    manufacturer_refs: dict[str, FhirReference] = {}
    performer_refs: dict[str, FhirReference] = {_performer_key(inp.practitioner): practitioner_ref}

    section_entries: list[FhirReference] = []

    for imm in inp.immunizations:
        manufacturer_ref: FhirReference | None = None
        if imm.manufacturer:
            manufacturer_ref = manufacturer_refs.get(imm.manufacturer)
            if manufacturer_ref is None:
                manufacturer_id = uuid_factory()
                entries.append(
                    build_organization(
                        OrganizationInput(name=imm.manufacturer),
                        resource_id=manufacturer_id,
                    )
                )
                manufacturer_ref = reference(f"Organization/{manufacturer_id}", "Organization")
                manufacturer_refs[imm.manufacturer] = manufacturer_ref

        performer_ref: FhirReference | None = None
        if imm.administered_by is not None:
            key = _performer_key(imm.administered_by)
            performer_ref = performer_refs.get(key)
            if performer_ref is None:
                performer_id = uuid_factory()
                entries.append(build_practitioner(imm.administered_by, resource_id=performer_id))
                performer_ref = reference(f"Practitioner/{performer_id}", "Practitioner")
                performer_refs[key] = performer_ref

        immunization_id = uuid_factory()
        entries.append(
            build_immunization(
                imm,
                resource_id=immunization_id,
                patient=patient_ref,
                now=now,
                manufacturer=manufacturer_ref,
                performer=performer_ref,
            )
        )
        immunization_ref = reference(f"Immunization/{immunization_id}", "Immunization")
        section_entries.append(immunization_ref)

        if imm.next_due_date:
            recommendation_id = uuid_factory()
            entries.append(
                _build_recommendation(
                    resource_id=recommendation_id,
                    inp=imm,
                    patient_ref=patient_ref,
                    immunization_ref=immunization_ref,
                    now=now,
                    authority=organization_ref,
                )
            )
            section_entries.append(
                reference(
                    f"ImmunizationRecommendation/{recommendation_id}",
                    "ImmunizationRecommendation",
                )
            )

    # Optional supporting document.
    if inp.document is not None:
        doc_id = uuid_factory()
        entries.append(
            document_reference_with_default_created(
                inp.document, resource_id=doc_id, subject=patient_ref, now=now
            )
        )
        section_entries.append(reference(f"DocumentReference/{doc_id}", "DocumentReference"))

    sections = []
    if section_entries:
        sections.append(
            {
                "title": "Immunization record",
                "code": {"text": "Immunization record"},
                "entry": section_entries,
            }
        )

    comp = build_composition(
        profile="ImmunizationRecord",
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

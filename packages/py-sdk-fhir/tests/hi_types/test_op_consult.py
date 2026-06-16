"""Integration tests for ``build_op_consult_bundle``."""

from __future__ import annotations

from hims_sdk_fhir import (
    AllergyInput,
    ChiefComplaintInput,
    DiagnosisInput,
    DocumentInput,
    LegacyVitalsInput,
    MedicineInput,
    OpConsultInput,
    OrganizationInput,
    PatientInput,
    PractitionerInput,
    build_op_consult_bundle,
)

from ._helpers import (
    assert_document_bundle_shape,
    assert_references_resolve,
    first_composition,
    resource_types,
)

_PATIENT = PatientInput(full_name="Asha Devi", gender="female", mrn="MRN-1")
_DOCTOR = PractitionerInput(full_name="Dr. Rao", registration_id="REG-9")


def _full_input() -> OpConsultInput:
    return OpConsultInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        chief_complaints=[ChiefComplaintInput(text="Fever")],
        diagnoses=[DiagnosisInput(text="Viral fever", certainty="confirmed")],
        medicines=[MedicineInput(name="Paracetamol", form="tablet", frequency="twice daily")],
        allergies=[AllergyInput(text="Penicillin", severity="severe")],
        legacy_vitals=LegacyVitalsInput(bp_systolic=120, bp_diastolic=80, pulse_bpm=72),
        organization=OrganizationInput(name="City Hospital", facility_id="FAC-1"),
        document=DocumentInput(title="Scan", data_base64="ZGF0YQ=="),
        signature_base64="c2ln",
    )


def test_full_bundle_shape(uuid_factory, clock):
    bundle = build_op_consult_bundle(_full_input(), uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    comp = first_composition(bundle)
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|2.0.0"
    ]
    assert comp["type"]["coding"][0]["code"] == "371530004"
    assert comp["title"] == "Consultation Report"

    types = resource_types(bundle)
    assert "Patient" in types
    assert "Practitioner" in types
    assert "Organization" in types
    assert "Condition" in types
    assert "Observation" in types
    assert "AllergyIntolerance" in types
    assert "MedicationRequest" in types
    assert "DocumentReference" in types

    section_titles = {section["title"] for section in comp["section"]}
    assert section_titles == {
        "Chief complaints",
        "Vital Signs",
        "Diagnosis",
        "Allergies",
        "Medications",
        "Document Reference",
    }

    assert bundle["signature"]["data"] == "c2ln"
    # signature.who must reference the same practitioner urn:uuid present as a fullUrl.
    assert bundle["signature"]["who"]["reference"] in {e["fullUrl"] for e in bundle["entry"]}


def test_minimal_bundle_omits_empty_sections(uuid_factory, clock):
    minimal = OpConsultInput(patient=_PATIENT, practitioner=_DOCTOR)
    bundle = build_op_consult_bundle(minimal, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    comp = first_composition(bundle)
    section_titles = [section["title"] for section in comp["section"]]
    # Only the always-present "no known allergies" section survives.
    assert section_titles == ["Allergies"]

    types = resource_types(bundle)
    assert "Observation" not in types
    assert "Organization" not in types
    assert "MedicationRequest" not in types
    assert "DocumentReference" not in types
    # AllergyIntolerance "no known allergies" sentinel is always present.
    assert "AllergyIntolerance" in types
    assert "signature" not in bundle


def test_optional_features_appear_only_when_provided(uuid_factory, clock):
    no_sig = OpConsultInput(patient=_PATIENT, practitioner=_DOCTOR)
    bundle = build_op_consult_bundle(no_sig, uuid_factory=uuid_factory, clock=clock)
    assert "signature" not in bundle

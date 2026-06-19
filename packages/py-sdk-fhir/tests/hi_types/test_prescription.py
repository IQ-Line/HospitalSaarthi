"""Integration tests for ``build_prescription_bundle``."""

from __future__ import annotations

from hims_sdk_fhir import (
    DiagnosisInput,
    MedicineInput,
    OrganizationInput,
    PatientInput,
    PractitionerInput,
    PrescriptionInput,
    build_prescription_bundle,
)

from ._helpers import (
    assert_document_bundle_shape,
    assert_references_resolve,
    first_composition,
    resource_types,
)

_PATIENT = PatientInput(full_name="Asha Devi", gender="female", mrn="MRN-1")
_DOCTOR = PractitionerInput(full_name="Dr. Rao", registration_id="REG-9")


def test_full_bundle_shape(uuid_factory, clock):
    inp = PrescriptionInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        diagnoses=[DiagnosisInput(text="Hypertension", certainty="confirmed")],
        medicines=[
            MedicineInput(name="Amlodipine", form="tablet", frequency="once daily"),
            MedicineInput(name="Aspirin", form="tablet"),
        ],
        organization=OrganizationInput(name="City Hospital", facility_id="FAC-1"),
        pdf_base64="cGRm",
        signature_base64="c2ln",
    )
    bundle = build_prescription_bundle(inp, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    comp = first_composition(bundle)
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord|2.0.0"
    ]
    assert comp["type"]["coding"][0]["code"] == "440545006"
    assert comp["title"] == "Prescription record"

    types = resource_types(bundle)
    assert "Patient" in types
    assert "Practitioner" in types
    assert "Condition" in types
    assert types.count("MedicationRequest") == 2
    assert "Binary" in types

    # MedicationRequest reasonReference resolves to the first Condition.
    med_requests = [
        e["resource"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "MedicationRequest"
    ]
    for med in med_requests:
        assert med["reasonReference"][0]["reference"].startswith("urn:uuid:")

    # Single Medication section carries med + binary refs.
    assert len(comp["section"]) == 1
    assert comp["section"][0]["title"] == "Medication"
    assert len(comp["section"][0]["entry"]) == 3  # 2 meds + 1 binary

    assert bundle["signature"]["data"] == "c2ln"


def test_minimal_bundle(uuid_factory, clock):
    minimal = PrescriptionInput(
        patient=_PATIENT,
        practitioner=_DOCTOR,
        medicines=[MedicineInput(name="Paracetamol")],
    )
    bundle = build_prescription_bundle(minimal, uuid_factory=uuid_factory, clock=clock)

    assert_document_bundle_shape(bundle)
    assert_references_resolve(bundle)

    types = resource_types(bundle)
    assert "Binary" not in types
    assert "Condition" not in types
    assert "Organization" not in types
    assert "signature" not in bundle

    # No diagnoses -> MedicationRequest has no reasonReference.
    med = next(
        e["resource"]
        for e in bundle["entry"]
        if e["resource"]["resourceType"] == "MedicationRequest"
    )
    assert "reasonReference" not in med


def test_binary_only_when_pdf(uuid_factory, clock):
    no_pdf = PrescriptionInput(
        patient=_PATIENT, practitioner=_DOCTOR, medicines=[MedicineInput(name="X")]
    )
    bundle = build_prescription_bundle(no_pdf, uuid_factory=uuid_factory, clock=clock)
    assert "Binary" not in resource_types(bundle)

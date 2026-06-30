"""Unit tests for the input dataclasses (composer inputs especially)."""

from __future__ import annotations

from hims_sdk_fhir import (
    ChiefComplaintInput,
    DocumentInput,
    EncounterInput,
    HealthDocumentInput,
    ImmunizationBundleInput,
    ImmunizationInput,
    OpConsultInput,
    PatientInput,
    PractitionerInput,
    PrescriptionInput,
)


def test_op_consult_constructs_with_required_only() -> None:
    inp = OpConsultInput(
        patient=PatientInput(full_name="Asha"),
        practitioner=PractitionerInput(full_name="Dr. Rao"),
    )
    assert inp.chief_complaints == ()
    assert inp.diagnoses == ()
    assert inp.medicines == ()
    assert inp.allergies == ()
    assert inp.vitals == ()
    assert inp.legacy_vitals is None
    assert isinstance(inp.encounter, EncounterInput)


def test_prescription_constructs_with_required_only() -> None:
    inp = PrescriptionInput(
        patient=PatientInput(full_name="Asha"),
        practitioner=PractitionerInput(full_name="Dr. Rao"),
    )
    assert inp.diagnoses == ()
    assert inp.medicines == ()
    assert inp.pdf_base64 is None


def test_immunization_bundle_constructs_with_required_only() -> None:
    inp = ImmunizationBundleInput(
        patient=PatientInput(full_name="Asha"),
        practitioner=PractitionerInput(full_name="Dr. Rao"),
    )
    assert inp.immunizations == ()


def test_health_document_constructs_with_required_only() -> None:
    inp = HealthDocumentInput(
        patient=PatientInput(full_name="Asha"),
        document=DocumentInput(title="Discharge note"),
    )
    assert inp.author is None
    assert isinstance(inp.encounter, EncounterInput)


def test_sequence_defaults_are_independent() -> None:
    a = OpConsultInput(
        patient=PatientInput(full_name="A"),
        practitioner=PractitionerInput(full_name="X"),
    )
    b = OpConsultInput(
        patient=PatientInput(full_name="B"),
        practitioner=PractitionerInput(full_name="Y"),
    )
    # Default factories must yield distinct (non-shared) objects.
    assert a.chief_complaints == ()
    assert b.chief_complaints == ()
    assert a.chief_complaints is not b.chief_complaints or a.chief_complaints == ()


def test_encounter_defaults_independent_across_composers() -> None:
    a = OpConsultInput(
        patient=PatientInput(full_name="A"),
        practitioner=PractitionerInput(full_name="X"),
    )
    b = PrescriptionInput(
        patient=PatientInput(full_name="B"),
        practitioner=PractitionerInput(full_name="Y"),
    )
    assert a.encounter is not b.encounter
    assert a.encounter.status == "finished"
    assert a.encounter.class_code == "AMB"


def test_accepts_provided_sequences() -> None:
    inp = OpConsultInput(
        patient=PatientInput(full_name="A"),
        practitioner=PractitionerInput(full_name="X"),
        chief_complaints=[ChiefComplaintInput(text="fever")],
    )
    assert len(inp.chief_complaints) == 1


def test_immunization_input_nested_practitioner() -> None:
    imm = ImmunizationInput(
        vaccine_name="BCG",
        administered_by=PractitionerInput(full_name="Nurse Joy"),
    )
    assert imm.administered_by.full_name == "Nurse Joy"

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from opd.data_access.registration_patient_source import VisitPatientSource
from opd.lib.build_clinical_report_payload import (
    _map_medical_history,
    build_clinical_report_request,
    clinical_payload_to_form_data,
    validate_report_request,
)
from opd.lib.clinical_report_context import ClinicalReportContext


def _sample_source() -> VisitPatientSource:
    """A real (contract-valid) visit source — the report models validate their input."""
    return VisitPatientSource(
        visit_uuid=uuid4(),
        visit_number="V-001",
        visit_created_at=datetime(2024, 1, 1, 10, 30, tzinfo=UTC),
        patient_id=uuid4(),
        patient_name="Test Patient",
        patient_uhid="UHID1",
        patient_phone=None,
        patient_abha_number=None,
        patient_abha_address=None,
    )


def _sample_form_data() -> dict:
    return {
        "vitals": {"systolic_bp": "120", "diastolic_bp": "80"},
        "chiefComplaints": [{"id": "1", "complaint": "Fever", "severity": "mild"}],
        "diagnosis": [{"id": "1", "notes": "Viral fever", "certainty": "presumed"}],
        "medicines": [
            {
                "id": "1",
                "medicine": "Paracetamol",
                "dosageMorning": "1",
                "dosageAfternoon": "0",
                "dosageNight": "1",
                "days": "3",
            }
        ],
        "immunizations": [{"vaccineName": "Hepatitis B", "dateOfDose": "2000-10-10T00:00:00Z"}],
    }


def test_prescription_report_available_from_stored_form_data() -> None:
    source = _sample_source()

    request = build_clinical_report_request(
        "prescription",
        form_data=_sample_form_data(),
        source=source,
        context=ClinicalReportContext(),
    )
    assert validate_report_request("prescription", request) is None
    assert len(request["diagnoses"]) == 1
    assert len(request["medicines"]) == 1


def test_op_consultation_report_includes_clinical_sections() -> None:
    source = _sample_source()

    request = build_clinical_report_request(
        "op-consultation",
        form_data=_sample_form_data(),
        source=source,
        context=ClinicalReportContext(),
    )
    assert validate_report_request("op-consultation", request) is None
    assert "complaints" in request
    assert "diagnoses" in request
    assert "medicines" in request
    assert "immunizations" in request


def test_medicine_strength_falls_back_to_clinical_payload() -> None:
    from opd.schemas.prescription.prescription import (
        PrescriptionClinicalPayload,
        PrescriptionMedicinePayload,
    )

    source = _sample_source()

    clinical = PrescriptionClinicalPayload(
        medicines=[
            PrescriptionMedicinePayload(line_no=1, name="Paracetamol", strength="500mg"),
        ],
    )
    form_data = {
        "medicines": [{"id": "1", "medicine": "Paracetamol", "days": "3"}],
        "diagnosis": [{"id": "1", "notes": "Fever"}],
    }

    request = build_clinical_report_request(
        "prescription",
        form_data=form_data,
        source=source,
        context=ClinicalReportContext(),
        clinical=clinical,
    )
    assert request["medicines"][0]["strength"] == "500mg"


def _rich_normalized_clinical():
    """A normalized clinical aggregate covering the sections the report renders.

    Mirrors a normalized-written prescription (empty legacy form_data blob): the
    report must source these entirely from the typed clinical payload.
    """
    from opd.schemas.prescription.prescription import (
        PrescriptionCarePlanPayload,
        PrescriptionClinicalPayload,
        PrescriptionDiagnosisPayload,
        PrescriptionMedicalHistoryAllergyPayload,
        PrescriptionMedicalHistoryPayload,
        PrescriptionOrderedImagingPayload,
    )

    return PrescriptionClinicalPayload(
        medical_history=PrescriptionMedicalHistoryPayload(
            diet_type="vegetarian", smoking_status="never"
        ),
        diagnoses=[
            PrescriptionDiagnosisPayload(line_no=1, notes="Viral fever", certainty="presumed")
        ],
        medical_history_allergies=[
            PrescriptionMedicalHistoryAllergyPayload(
                line_no=1, allergen_text="Penicillin", reaction_text="Rash"
            )
        ],
        care_plan=PrescriptionCarePlanPayload(
            advice="Rest", refer_to="Cardiology", next_visit_value=7, next_visit_unit="days"
        ),
        ordered_imaging=[PrescriptionOrderedImagingPayload(line_no=1, name="Chest X-ray")],
    )


def test_clinical_payload_to_form_data_carries_diet_and_full_sections() -> None:
    """The normalized->form_data converter (now the report source) must be complete.

    Fails on the pre-change converter, which omitted ``dietType`` entirely — so a
    normalized-written prescription would silently lose diet on the report once the
    legacy ``form_data`` blob is dropped.
    """
    form = clinical_payload_to_form_data(_rich_normalized_clinical())

    assert form["medicalHistory"]["dietType"] == "vegetarian"
    assert form["diagnosis"][0]["notes"] == "Viral fever"
    assert form["allergyDetails"][0]["allergen"] == "Penicillin"
    assert form["carePlan"]["advice"] == "Rest"
    assert form["carePlan"]["referTo"] == "Cardiology"
    assert form["imagingRequired"][0]["testName"] == "Chest X-ray"


def test_report_medical_history_surfaces_diet_from_normalized_clinical() -> None:
    """End to end: diet flows normalized clinical -> converter -> report mapper."""
    form = clinical_payload_to_form_data(_rich_normalized_clinical())
    mapped = _map_medical_history(form)

    assert mapped is not None
    assert mapped["dietType"] == "vegetarian"


def test_immunization_date_of_dose_is_date_only() -> None:
    source = _sample_source()

    form = _sample_form_data()
    request = build_clinical_report_request(
        "immunization",
        form_data=form,
        source=source,
        context=ClinicalReportContext(),
    )
    assert request["immunizations"][0]["dateOfDose"] == "2000-10-10"

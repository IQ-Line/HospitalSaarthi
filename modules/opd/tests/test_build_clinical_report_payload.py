from __future__ import annotations

from opd.lib.build_clinical_report_payload import (
    build_clinical_report_request,
    validate_report_request,
)
from opd.lib.clinical_report_context import ClinicalReportContext


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
    from unittest.mock import MagicMock

    source = MagicMock()
    source.visit_number = "V-001"
    source.patient_name = "Test Patient"
    source.patient_age_years = 30
    source.patient_gender = "male"
    source.patient_uhid = "UHID1"
    source.doctor_name = "Dr Test"
    source.department_name = "Medicine"

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
    from unittest.mock import MagicMock

    source = MagicMock()
    source.visit_number = "V-001"
    source.patient_name = "Test Patient"
    source.patient_age_years = 30
    source.patient_gender = "male"
    source.patient_uhid = "UHID1"
    source.doctor_name = "Dr Test"
    source.department_name = "Medicine"

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
    from unittest.mock import MagicMock

    from opd.schemas.prescription.prescription import (
        PrescriptionClinicalPayload,
        PrescriptionMedicinePayload,
    )

    source = MagicMock()
    source.visit_number = "V-001"
    source.patient_name = "Test Patient"
    source.patient_age_years = 30
    source.patient_gender = "male"
    source.patient_uhid = "UHID1"
    source.doctor_name = "Dr Test"
    source.department_name = "Medicine"

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


def test_immunization_date_of_dose_is_date_only() -> None:
    from unittest.mock import MagicMock

    source = MagicMock()
    source.visit_number = "V-001"
    source.patient_name = "Test Patient"
    source.patient_age_years = 30
    source.patient_gender = "male"
    source.patient_uhid = "UHID1"
    source.doctor_name = "Dr Test"
    source.department_name = "Medicine"

    form = _sample_form_data()
    request = build_clinical_report_request(
        "immunization",
        form_data=form,
        source=source,
        context=ClinicalReportContext(),
    )
    assert request["immunizations"][0]["dateOfDose"] == "2000-10-10"

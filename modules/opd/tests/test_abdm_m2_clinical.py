import base64
from uuid import uuid4

from hims_sdk_fhir import build_op_consult_bundle

from opd.integrations.abdm_m2 import (
    _clinical_summary_from_form_data,
    stamp_bundle_identifier,
)
from opd.integrations.fhir_bundle_mappers import (
    to_diagnoses,
    to_encounter_input,
    to_medicines,
    to_op_consult_input,
    to_patient_input,
    to_practitioner_input,
)

SAMPLE_FORM_DATA = {
    "chiefComplaints": [
        {
            "complaint": "Fever",
            "duration": "3",
            "durationUnit": "days",
        }
    ],
    "medicalHistory": {"historyOfPresentIllness": "Intermittent fever since 3 days"},
    "diagnosis": [{"notes": "Viral fever", "certainty": "presumed"}],
    "medicines": [
        {
            "medicine": "Paracetamol",
            "dosage": "500mg",
            "frequency": "BD",
            "days": "5",
        }
    ],
    "vitals": {"systolic_bp": "120", "diastolic_bp": "80", "pulse_rate": "78"},
    "carePlan": {"advice": "Rest and fluids"},
}


def test_clinical_summary_reads_create_rx_form_fields() -> None:
    summary = _clinical_summary_from_form_data(SAMPLE_FORM_DATA)

    assert "Fever" in summary
    assert "History of present illness" in summary
    assert "Viral fever" in summary
    assert "Paracetamol" in summary
    assert "Vitals:" in summary
    assert "Advice:" in summary
    assert summary != "OP consultation record"


def test_op_consult_bundle_via_sdk_includes_clinical_resources() -> None:
    sample_pdf = base64.b64encode(
        b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    ).decode("ascii")

    bundle_input = to_op_consult_input(
        patient=to_patient_input(patient_name="Patient"),
        practitioner=to_practitioner_input("Dr. Mehta"),
        encounter=to_encounter_input(uuid4()),
        form_data=SAMPLE_FORM_DATA,
        document_pdf_base64=sample_pdf,
    )
    bundle = build_op_consult_bundle(bundle_input)
    stamp_bundle_identifier(bundle, "visit-1_OPConsultNote")

    types = [e["resource"]["resourceType"] for e in bundle["entry"]]
    assert types[0] == "Composition"
    assert "DocumentReference" in types
    assert bundle["identifier"]["value"] == "visit-1_OPConsultNote"

    comp = bundle["entry"][0]["resource"]
    assert comp["type"]["coding"][0]["code"] == "371530004"

    doc_ref = next(
        e for e in bundle["entry"] if e["resource"]["resourceType"] == "DocumentReference"
    )
    attachment = doc_ref["resource"]["content"][0]["attachment"]
    assert attachment["contentType"] == "application/pdf"
    assert base64.b64decode(attachment["data"]).startswith(b"%PDF")


def test_mappers_extract_diagnosis_and_medicines() -> None:
    assert len(to_diagnoses(SAMPLE_FORM_DATA)) == 1
    assert len(to_medicines(SAMPLE_FORM_DATA)) == 1
    assert to_medicines(SAMPLE_FORM_DATA)[0].name == "Paracetamol"

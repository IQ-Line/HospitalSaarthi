from opd.integrations.abdm_m2 import (
    _build_op_consult_bundle,
    _clinical_summary_from_form_data,
)


def test_clinical_summary_reads_create_rx_form_fields() -> None:
    summary = _clinical_summary_from_form_data(
        {
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
    )

    assert "Fever" in summary
    assert "History of present illness" in summary
    assert "Viral fever" in summary
    assert "Paracetamol" in summary
    assert "Vitals:" in summary
    assert "Advice:" in summary
    assert summary != "OP consultation record"


def test_op_consult_bundle_includes_clinical_resources() -> None:
    import base64

    sample_pdf = base64.b64encode(
        b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    ).decode("ascii")
    bundle = _build_op_consult_bundle(
        care_context_ref="visit-1_OPConsultNote",
        display="OP consultation visit-1_OPConsultNote",
        snapshot=None,
        document_pdf_base64=sample_pdf,
    )
    types = [e["resource"]["resourceType"] for e in bundle["entry"]]
    assert types[0] == "Composition"
    assert "DocumentReference" in types

    doc_ref = next(e for e in bundle["entry"] if e["resource"]["resourceType"] == "DocumentReference")
    attachment = doc_ref["resource"]["content"][0]["attachment"]
    assert attachment["contentType"] == "application/pdf"
    assert base64.b64decode(attachment["data"]).startswith(b"%PDF")

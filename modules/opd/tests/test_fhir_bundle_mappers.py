from opd.integrations.clinical_form_helpers import (
    abdm_immunization_debug,
    has_immunization_data,
    has_prescription_clinical_data,
    immunization_rows_from_form_data,
)
from opd.integrations.fhir_bundle_mappers import (
    to_chief_complaints,
    to_immunization_inputs,
    to_legacy_vitals,
    to_patient_input,
)


def test_to_patient_input_normalizes_gender() -> None:
    patient = to_patient_input(patient_name="Asha", gender="M", abha_address="asha@sbx")
    assert patient.full_name == "Asha"
    assert patient.gender == "male"
    assert patient.abha_address == "asha@sbx"


def test_to_legacy_vitals_maps_flat_grid() -> None:
    vitals = to_legacy_vitals(
        {"systolic_bp": "120", "diastolic_bp": "80", "pulse_rate": "72"}
    )
    assert vitals is not None
    assert vitals.bp_systolic == 120.0
    assert vitals.bp_diastolic == 80.0
    assert vitals.pulse_bpm == 72.0


def test_to_chief_complaints_formats_duration() -> None:
    complaints = to_chief_complaints(
        {
            "chiefComplaints": [
                {"complaint": "Cough", "duration": "2", "durationUnit": "days"}
            ]
        }
    )
    assert len(complaints) == 1
    assert "Cough" in complaints[0].text
    assert "2 days" in complaints[0].text


def test_immunization_inputs_from_form_data() -> None:
    rows = to_immunization_inputs(
        {
            "immunizations": [
                {
                    "vaccineName": "Hepatitis B",
                    "dateOfDose": "2020-10-10T00:00:00Z",
                    "doseNumber": 1,
                }
            ]
        }
    )
    assert len(rows) == 1
    assert rows[0].vaccine_name == "Hepatitis B"
    assert rows[0].date == "2020-10-10"


def test_prescription_and_immunization_gates() -> None:
    assert has_prescription_clinical_data({"medicines": [{"medicine": "Paracetamol"}]})
    assert not has_prescription_clinical_data({"medicines": []})
    assert has_immunization_data({"immunizations": [{"vaccineName": "BCG"}]})
    assert has_immunization_data({"vaccines_required": [{"name": "MMR"}]})
    assert not has_immunization_data({"immunizations": []})
    assert not has_immunization_data({"immunizations": [{}]})


def test_immunization_inputs_from_vaccines_required() -> None:
    rows = to_immunization_inputs(
        {
            "vaccines_required": [
                {
                    "name": "Polio",
                    "instructions": (
                        "__hims_immunization_v1:"
                        "{\"dateOfDose\":\"2019-05-01\",\"doseNumber\":2}"
                    ),
                }
            ]
        }
    )
    assert len(rows) == 1
    assert rows[0].vaccine_name == "Polio"
    assert rows[0].date == "2019-05-01"
    assert rows[0].dose_number == 2


def test_immunization_rows_dedupe_across_sources() -> None:
    rows = immunization_rows_from_form_data(
        {
            "immunizations": [{"vaccineName": "BCG"}],
            "vaccines_required": [{"name": "BCG"}],
        }
    )
    assert len(rows) == 1


def test_abdm_immunization_debug_reports_gate() -> None:
    debug = abdm_immunization_debug(
        {
            "chiefComplaints": [{"complaint": "Fever"}],
            "immunizations": [{"vaccineName": "BCG"}],
        }
    )
    assert debug["has_immunization_data"] is True
    assert debug["resolved_vaccine_names"] == ["BCG"]
    assert debug["immunizations_len"] == 1

    empty = abdm_immunization_debug(
        {"immunizations": [{}], "chiefComplaints": [{"complaint": "x"}]}
    )
    assert empty["has_immunization_data"] is False
    assert empty["resolved_row_count"] == 0

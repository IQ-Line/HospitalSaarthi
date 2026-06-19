"""Unit tests for ``build_immunization``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_immunization
from hims_sdk_fhir.inputs import ImmunizationInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Immunization"
PATIENT = {"reference": "Patient/pat-1"}
NOW = "2026-06-12T10:00:00+05:30"


def test_minimal_immunization_uses_now() -> None:
    imm = build_immunization(
        ImmunizationInput(vaccine_name="COVISHIELD"),
        resource_id="imm-1",
        patient=PATIENT,
        now=NOW,
    )
    assert imm["resourceType"] == "Immunization"
    assert imm["id"] == "imm-1"
    assert imm["meta"]["profile"] == [PROFILE]
    assert imm["status"] == "completed"
    assert imm["vaccineCode"]["text"] == "COVISHIELD"
    assert imm["occurrenceDateTime"] == NOW
    assert "protocolApplied" not in imm
    assert "lotNumber" not in imm
    assert "manufacturer" not in imm
    assert "performer" not in imm


def test_full_immunization() -> None:
    imm = build_immunization(
        ImmunizationInput(
            vaccine_name="COVISHIELD",
            date="2026-01-01",
            dose_number=2,
            lot_number="LOT-9",
        ),
        resource_id="imm-1",
        patient=PATIENT,
        now=NOW,
        manufacturer={"reference": "Organization/org-1"},
        performer={"reference": "Practitioner/prac-1"},
    )
    assert imm["occurrenceDateTime"] == "2026-01-01"
    assert imm["lotNumber"] == "LOT-9"
    assert imm["protocolApplied"] == [{"doseNumberPositiveInt": 2}]
    assert imm["manufacturer"] == {"reference": "Organization/org-1"}
    assert imm["performer"] == [{"actor": {"reference": "Practitioner/prac-1"}}]


def test_unparseable_date_falls_back_to_occurrence_string() -> None:
    imm = build_immunization(
        ImmunizationInput(vaccine_name="X", date="sometime last winter"),
        resource_id="imm-1",
        patient=PATIENT,
        now=NOW,
    )
    assert imm["occurrenceString"] == "sometime last winter"
    assert "occurrenceDateTime" not in imm

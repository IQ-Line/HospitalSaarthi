"""Unit tests for ``build_allergy_intolerance``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_allergy_intolerance
from hims_sdk_fhir.inputs import AllergyInput

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/AllergyIntolerance"
PATIENT = {"reference": "Patient/pat-1"}
RECORDED = "2026-06-12T10:00:00+05:30"


def test_no_known_allergies_when_none() -> None:
    allergy = build_allergy_intolerance(
        None, resource_id="al-1", patient=PATIENT, recorded_date=RECORDED
    )
    assert allergy["resourceType"] == "AllergyIntolerance"
    assert allergy["id"] == "al-1"
    assert allergy["meta"]["profile"] == [PROFILE]
    assert allergy["code"]["text"] == "No known allergy"
    assert allergy["note"][0]["text"] == "The patient reports no known allergies."
    assert allergy["clinicalStatus"]["coding"][0]["code"] == "active"
    assert allergy["verificationStatus"]["coding"][0]["code"] == "confirmed"
    assert "recorder" not in allergy


def test_known_allergy_with_note_and_recorder() -> None:
    allergy = build_allergy_intolerance(
        AllergyInput(text="Penicillin", reaction="rash", severity="moderate"),
        resource_id="al-1",
        patient=PATIENT,
        recorder={"reference": "Practitioner/prac-1"},
        recorded_date=RECORDED,
    )
    assert allergy["code"]["text"] == "Penicillin"
    assert allergy["note"][0]["text"] == "rash - moderate"
    assert allergy["recorder"] == {"reference": "Practitioner/prac-1"}


def test_known_allergy_no_note_when_no_detail() -> None:
    allergy = build_allergy_intolerance(
        AllergyInput(text="Dust"),
        resource_id="al-1",
        patient=PATIENT,
        recorded_date=RECORDED,
    )
    assert "note" not in allergy

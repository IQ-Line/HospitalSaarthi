"""Unit tests for ``build_composition``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_composition

SUBJECT = {"reference": "Patient/pat-1"}
AUTHOR = [{"reference": "Practitioner/prac-1"}]
TYPE = {"coding": [{"system": "http://snomed.info/sct", "code": "371530004"}]}
DATE = "2026-06-12T10:00:00+05:30"
SECTIONS = [{"title": "Chief Complaints", "entry": [{"reference": "Condition/cond-1"}]}]


def test_minimal_composition() -> None:
    comp = build_composition(
        profile="OpConsultRecord",
        type=TYPE,
        subject=SUBJECT,
        author=AUTHOR,
        date=DATE,
        title="Consultation Report",
        sections=SECTIONS,
    )
    assert comp["resourceType"] == "Composition"
    # Document-level profile carries |version (not the bare resource profile).
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord|2.0.0"
    ]
    assert comp["status"] == "final"
    assert comp["type"] == TYPE
    assert comp["subject"] == SUBJECT
    assert comp["author"] == AUTHOR
    assert comp["title"] == "Consultation Report"
    assert comp["section"] == SECTIONS
    assert comp["text"]["status"] == "generated"
    assert "Consultation Report" in comp["text"]["div"]
    assert "encounter" not in comp
    assert "custodian" not in comp
    assert "identifier" not in comp


def test_optional_encounter_custodian_identifier_status() -> None:
    comp = build_composition(
        profile="Prescription",
        type=TYPE,
        subject=SUBJECT,
        author=AUTHOR,
        date=DATE,
        title="Prescription record",
        sections=SECTIONS,
        encounter={"reference": "Encounter/enc-1"},
        custodian={"reference": "Organization/org-1"},
        identifier={"system": "https://ndhm.in", "value": "abc"},
        status="preliminary",
    )
    assert comp["encounter"] == {"reference": "Encounter/enc-1"}
    assert comp["custodian"] == {"reference": "Organization/org-1"}
    assert comp["identifier"] == {"system": "https://ndhm.in", "value": "abc"}
    assert comp["status"] == "preliminary"
    assert comp["meta"]["profile"] == [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord|2.0.0"
    ]

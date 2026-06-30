"""Unit tests for ``build_medication_statement``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_medication_statement

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationStatement"
SUBJECT = {"reference": "Patient/pat-1"}


def test_minimal_medication_statement() -> None:
    stmt = build_medication_statement(resource_id="ms-1", text="Metformin 500mg", subject=SUBJECT)
    assert stmt["resourceType"] == "MedicationStatement"
    assert stmt["id"] == "ms-1"
    assert stmt["meta"]["profile"] == [PROFILE]
    assert stmt["status"] == "active"
    assert stmt["medicationCodeableConcept"]["text"] == "Metformin 500mg"
    assert stmt["subject"] == SUBJECT
    assert "effectiveDateTime" not in stmt


def test_effective_date() -> None:
    stmt = build_medication_statement(
        resource_id="ms-1",
        text="Metformin",
        subject=SUBJECT,
        effective="2026-06-12T10:00:00+05:30",
    )
    assert stmt["effectiveDateTime"] == "2026-06-12T10:00:00+05:30"

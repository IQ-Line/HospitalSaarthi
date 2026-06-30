"""Unit tests for ``build_condition``."""

from __future__ import annotations

from hims_sdk_fhir.builders import build_condition

PROFILE = "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition"
SUBJECT = {"reference": "Patient/pat-1"}


def test_minimal_condition() -> None:
    cond = build_condition(resource_id="cond-1", text="Hypertension", subject=SUBJECT)
    assert cond["resourceType"] == "Condition"
    assert cond["id"] == "cond-1"
    assert cond["meta"]["profile"] == [PROFILE]
    assert cond["clinicalStatus"]["coding"][0]["code"] == "active"
    assert cond["code"] == {"text": "Hypertension"}
    assert cond["subject"] == SUBJECT
    assert "verificationStatus" not in cond
    assert "category" not in cond


def test_certainty_confirmed() -> None:
    cond = build_condition(
        resource_id="cond-1", text="Diabetes", subject=SUBJECT, certainty="confirmed"
    )
    assert cond["verificationStatus"]["coding"][0]["code"] == "confirmed"


def test_certainty_non_confirmed_is_provisional() -> None:
    cond = build_condition(
        resource_id="cond-1", text="Diabetes", subject=SUBJECT, certainty="suspected"
    )
    assert cond["verificationStatus"]["coding"][0]["code"] == "provisional"


def test_problem_list_category() -> None:
    cond = build_condition(
        resource_id="cond-1",
        text="Asthma",
        subject=SUBJECT,
        category_problem_list=True,
        recorded_date="2026-06-12T10:00:00+05:30",
    )
    assert cond["category"][0]["coding"][0]["code"] == "problem-list-item"
    assert cond["recordedDate"] == "2026-06-12T10:00:00+05:30"

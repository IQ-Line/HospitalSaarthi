"""Unit tests for ``build_vital_observations``."""

from __future__ import annotations

from collections.abc import Callable

from hims_sdk_fhir.builders import build_vital_observations
from hims_sdk_fhir.inputs import LegacyVitalsInput, VitalSignInput

SUBJECT = {"reference": "Patient/pat-1"}
NOW = "2026-06-12T10:00:00+05:30"


def test_legacy_bp_one_observation_two_components(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=LegacyVitalsInput(bp_systolic=120, bp_diastolic=80),
        vitals=(),
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    assert len(obs) == 1
    bp = obs[0]
    assert bp["code"]["text"] == "Blood Pressure"
    assert len(bp["component"]) == 2
    assert bp["component"][0]["valueQuantity"]["code"] == "mm[Hg]"
    assert bp["component"][1]["valueQuantity"]["code"] == "mm[Hg]"
    # Owns its own id from the factory.
    assert bp["id"] == "00000000-0000-0000-0000-000000000001"
    assert bp["category"][0]["coding"][0]["code"] == "vital-signs"


def test_legacy_scalars_ucum(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=LegacyVitalsInput(
            pulse_bpm=72,
            temperature_f=98.6,
            respiratory_rate=16,
            spo2_percent=98,
            height_cm=170,
            weight_kg=65,
            bmi=22.5,
            blood_sugar_mg_dl=110,
        ),
        vitals=(),
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    by_code = {o["code"]["text"]: o for o in obs}
    assert by_code["Pulse Rate"]["valueQuantity"]["code"] == "/min"
    assert by_code["Temperature"]["valueQuantity"]["code"] == "[degF]"
    assert by_code["Respiratory Rate"]["valueQuantity"]["code"] == "/min"
    assert by_code["Oxygen Saturation"]["valueQuantity"]["code"] == "%"
    assert by_code["Height"]["valueQuantity"]["code"] == "cm"
    assert by_code["Weight"]["valueQuantity"]["code"] == "kg"
    assert by_code["Body Mass Index"]["valueQuantity"]["code"] == "kg/m2"
    assert by_code["Random Blood Sugar"]["valueQuantity"]["code"] == "mg/dL"
    # Each carries vital-signs category + an id.
    for o in obs:
        assert o["category"][0]["coding"][0]["code"] == "vital-signs"
        assert o["id"].startswith("00000000-0000-0000-0000-")


def test_versioned_numeric_value_quantity(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=None,
        vitals=[VitalSignInput(code="Heart Rate", value=80, unit="bpm", ucum_code="/min")],
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    assert len(obs) == 1
    assert obs[0]["valueQuantity"] == {
        "value": 80.0,
        "system": "http://unitsofmeasure.org",
        "unit": "bpm",
        "code": "/min",
    }


def test_versioned_non_numeric_value_string(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=None,
        vitals=[VitalSignInput(code="Gait", value="steady")],
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    assert obs[0]["valueString"] == "steady"
    assert "valueQuantity" not in obs[0]


def test_versioned_takes_precedence_over_legacy(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=LegacyVitalsInput(pulse_bpm=72),
        vitals=[VitalSignInput(code="Heart Rate", value=80)],
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    assert len(obs) == 1
    assert obs[0]["code"]["text"] == "Heart Rate"


def test_no_vitals_empty_list(uuid_factory: Callable[[], str]) -> None:
    assert (
        build_vital_observations(
            legacy=None, vitals=(), subject=SUBJECT, now=NOW, uuid_factory=uuid_factory
        )
        == []
    )


def test_versioned_recorded_at_overrides_now(uuid_factory: Callable[[], str]) -> None:
    obs = build_vital_observations(
        legacy=None,
        vitals=[VitalSignInput(code="HR", value=80, recorded_at="2026-06-11T08:00:00+05:30")],
        subject=SUBJECT,
        now=NOW,
        uuid_factory=uuid_factory,
    )
    assert obs[0]["effectiveDateTime"] == "2026-06-11T08:00:00+05:30"

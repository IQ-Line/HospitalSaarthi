"""``build_vital_observations`` — fan-out vitals → Observation resources.

Mirrors legacy ``bundleVitalsObservations.js``. The versioned ``vitals`` list
takes precedence (numeric value → ``valueQuantity``, else ``valueString``);
otherwise the flat ``legacy`` fields each map to a UCUM-coded Observation
(blood pressure → one Observation with systolic/diastolic components).

This is the one Layer-1 builder that owns its ids: it calls ``uuid_factory``
for each Observation it emits (variable fan-out).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see related-projects hims-backend-ai-based/utils/bundleVitalsObservations.js
"""

from __future__ import annotations

from collections.abc import Sequence

from ..inputs import LegacyVitalsInput, VitalSignInput
from ..lib import UuidFactory
from ..types import FhirReference, Observation
from .observation import build_observation, quantity


def _coerce_number(value: float | str) -> float | None:
    """Return ``value`` as a finite float, or ``None`` if non-numeric."""
    if isinstance(value, bool):  # bool is an int subclass; never a vital number
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    try:
        num = float(text)
    except ValueError:
        return None
    return num if num == num and num not in (float("inf"), float("-inf")) else None


def build_vital_observations(
    *,
    legacy: LegacyVitalsInput | None,
    vitals: Sequence[VitalSignInput],
    subject: FhirReference,
    now: str,
    uuid_factory: UuidFactory,
) -> list[Observation]:
    """Build the list of vital-signs ``Observation`` resources.

    Versioned ``vitals`` are emitted first; only when none are present are the
    flat ``legacy`` fields used (mirrors the legacy plan's fallback).
    """
    observations: list[Observation] = []

    if vitals:
        for vital in vitals:
            num = _coerce_number(vital.value)
            effective = vital.recorded_at or now
            if num is not None:
                obs = build_observation(
                    resource_id=uuid_factory(),
                    code_text=vital.code,
                    subject=subject,
                    effective=effective,
                    value_quantity=(num, vital.unit, vital.ucum_code),
                    category_vital_signs=True,
                )
            else:
                obs = build_observation(
                    resource_id=uuid_factory(),
                    code_text=vital.code,
                    subject=subject,
                    effective=effective,
                    value_string=str(vital.value),
                    category_vital_signs=True,
                )
            observations.append(obs)
        return observations

    if legacy is None:
        return observations

    # Blood pressure → one Observation with two UCUM components.
    sys_num = _coerce_number(legacy.bp_systolic) if legacy.bp_systolic is not None else None
    dia_num = _coerce_number(legacy.bp_diastolic) if legacy.bp_diastolic is not None else None
    components: list[dict] = []
    if sys_num is not None:
        components.append(
            {"code": {"text": "Systolic"}, "valueQuantity": quantity(sys_num, "mmHg", "mm[Hg]")}
        )
    if dia_num is not None:
        components.append(
            {"code": {"text": "Diastolic"}, "valueQuantity": quantity(dia_num, "mmHg", "mm[Hg]")}
        )
    if components:
        observations.append(
            build_observation(
                resource_id=uuid_factory(),
                code_text="Blood Pressure",
                subject=subject,
                effective=now,
                components=components,
                category_vital_signs=True,
            )
        )

    # Single-value legacy vitals, in legacy emission order.
    scalar_plan: list[tuple[float | None, str, str, str]] = [
        (legacy.pulse_bpm, "Pulse Rate", "beats/minute", "/min"),
        (legacy.temperature_f, "Temperature", "°F", "[degF]"),
        (legacy.respiratory_rate, "Respiratory Rate", "breaths/minute", "/min"),
        (legacy.spo2_percent, "Oxygen Saturation", "%", "%"),
        (legacy.height_cm, "Height", "cm", "cm"),
        (legacy.weight_kg, "Weight", "kg", "kg"),
        (legacy.bmi, "Body Mass Index", "kg/m2", "kg/m2"),
        (legacy.blood_sugar_mg_dl, "Random Blood Sugar", "mg/dL", "mg/dL"),
    ]
    for raw_value, code_text, unit, ucum in scalar_plan:
        if raw_value is None:
            continue
        num = _coerce_number(raw_value)
        if num is None:
            continue
        observations.append(
            build_observation(
                resource_id=uuid_factory(),
                code_text=code_text,
                subject=subject,
                effective=now,
                value_quantity=(num, unit, ucum),
                category_vital_signs=True,
            )
        )

    return observations

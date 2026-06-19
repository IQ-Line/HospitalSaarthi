"""``build_observation`` — Layer-1 Observation resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/observation.html
"""

from __future__ import annotations

from typing import Any

from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirQuantity, FhirReference, Observation

_OBSERVATION_CATEGORY = "http://terminology.hl7.org/CodeSystem/observation-category"
_UCUM = "http://unitsofmeasure.org"

# Exported so vitals.py can build components with the same UCUM system.
VITAL_SIGNS_CATEGORY = {
    "coding": [
        {
            "system": _OBSERVATION_CATEGORY,
            "code": "vital-signs",
            "display": "Vital Signs",
        }
    ]
}


def quantity(value: float, unit: str | None = None, ucum: str | None = None) -> FhirQuantity:
    """Build a UCUM ``FhirQuantity`` (unit/code omitted when ``None``)."""
    q: FhirQuantity = {"value": value, "system": _UCUM}
    if unit:
        q["unit"] = unit
    if ucum:
        q["code"] = ucum
    return q


def build_observation(
    *,
    resource_id: str,
    code_text: str,
    subject: FhirReference,
    effective: str,
    value_quantity: tuple[float, str | None, str | None] | None = None,
    value_string: str | None = None,
    category_vital_signs: bool = False,
    components: list[dict] | None = None,
) -> Observation:
    """Build an ``Observation`` resource (``status: final``).

    Exactly one of ``value_quantity`` / ``value_string`` / ``components`` is
    expected to be provided by the caller.
    """
    observation: Observation = {
        "resourceType": "Observation",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Observation")]},
        "status": "final",
        "code": {"text": code_text},
        "subject": subject,
        "effectiveDateTime": effective,
    }

    if category_vital_signs:
        observation["category"] = [VITAL_SIGNS_CATEGORY]

    if value_quantity is not None:
        value, unit, ucum = value_quantity
        observation["valueQuantity"] = quantity(value, unit, ucum)
    elif value_string is not None:
        observation["valueString"] = value_string
    elif components is not None:
        component_list: list[dict[str, Any]] = components
        observation["component"] = component_list

    return compact(observation)

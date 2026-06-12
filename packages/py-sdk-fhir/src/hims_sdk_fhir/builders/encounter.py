"""``build_encounter`` — Layer-1 Encounter resource builder.

Emits the literal ``"class"`` JSON key (the TypedDict field is ``class_``).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/encounter.html
"""

from __future__ import annotations

from ..inputs import EncounterInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import Encounter, FhirReference

_V3_ACT_CODE = "http://terminology.hl7.org/CodeSystem/v3-ActCode"

# ActEncounterCode display lookup (extend as new class codes are used).
_CLASS_DISPLAY: dict[str, str] = {
    "AMB": "ambulatory",
    "IMP": "inpatient encounter",
    "EMER": "emergency",
    "HH": "home health",
    "VR": "virtual",
}


def build_encounter(
    inp: EncounterInput,
    *,
    resource_id: str,
    subject: FhirReference,
    now: str,
) -> Encounter:
    """Build an ``Encounter`` resource.

    Identifier value falls back to ``resource_id`` when no ``visit_number``;
    ``class`` is the v3 ActCode coding for ``class_code``; ``period.start``
    defaults to ``now``.
    """
    encounter: Encounter = {
        "resourceType": "Encounter",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Encounter")]},
        "identifier": [{"system": "https://ndhm.in", "value": inp.visit_number or resource_id}],
        "status": inp.status,
        # Literal "class" key — see types.Encounter.class_ note.
        "class": {
            "system": _V3_ACT_CODE,
            "code": inp.class_code,
            "display": _CLASS_DISPLAY.get(inp.class_code, inp.class_code),
        },
        "subject": subject,
        "period": {"start": inp.start or now},
    }
    return compact(encounter)

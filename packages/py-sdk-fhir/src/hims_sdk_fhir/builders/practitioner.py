"""``build_practitioner`` — Layer-1 Practitioner resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/practitioner.html
"""

from __future__ import annotations

from ..inputs import PractitionerInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirIdentifier, Practitioner

_V2_0203 = "http://terminology.hl7.org/CodeSystem/v2-0203"
_DOCTOR_NDHM_SYSTEM = "https://doctor.ndhm.gov.in"


def build_practitioner(inp: PractitionerInput, *, resource_id: str) -> Practitioner:
    """Build a ``Practitioner`` resource.

    Emits a medical-council registration identifier (v2-0203 ``MD``) when a
    ``registration_id`` is given.
    """
    identifiers: list[FhirIdentifier] = []
    if inp.registration_id:
        identifiers.append(
            {
                "type": {
                    "coding": [
                        {
                            "system": _V2_0203,
                            "code": "MD",
                            "display": "Medical License number",
                        }
                    ]
                },
                "system": _DOCTOR_NDHM_SYSTEM,
                "value": inp.registration_id,
            }
        )

    practitioner: Practitioner = {
        "resourceType": "Practitioner",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Practitioner")]},
        "identifier": identifiers,
        "name": [{"text": inp.full_name}],
    }
    return compact(practitioner)

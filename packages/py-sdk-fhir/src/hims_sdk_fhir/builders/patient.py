"""``build_patient`` — Layer-1 Patient resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/patient.html
"""

from __future__ import annotations

from ..identifiers import (
    ABHA_ADDRESS_SYSTEM_URI,
    ABHA_NUMBER_SYSTEM_URI,
    MRN_SYSTEM_URI,
)
from ..inputs import PatientInput
from ..lib import compact, safe_birth_date
from ..profile_registry import resource_profile
from ..types import FhirIdentifier, Patient

_V2_0203 = "http://terminology.hl7.org/CodeSystem/v2-0203"


def build_patient(inp: PatientInput, *, resource_id: str) -> Patient:
    """Build a ``Patient`` resource from ``inp``.

    Emits MRN (v2-0203 ``MR``), ABHA number, and ABHA address identifiers when
    present, the human name, gender, safe birth date, and a home phone telecom.
    """
    identifiers: list[FhirIdentifier] = []
    if inp.mrn:
        identifiers.append(
            {
                "type": {
                    "coding": [
                        {
                            "system": _V2_0203,
                            "code": "MR",
                            "display": "Medical record number",
                        }
                    ]
                },
                "system": MRN_SYSTEM_URI,
                "value": inp.mrn,
            }
        )
    if inp.abha_number:
        identifiers.append({"system": ABHA_NUMBER_SYSTEM_URI, "value": inp.abha_number})
    if inp.abha_address:
        identifiers.append({"system": ABHA_ADDRESS_SYSTEM_URI, "value": inp.abha_address})

    telecom = []
    if inp.phone:
        telecom.append({"system": "phone", "value": inp.phone, "use": "home"})

    patient: Patient = {
        "resourceType": "Patient",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Patient")]},
        "identifier": identifiers,
        "name": [{"text": inp.full_name}],
        "telecom": telecom,
        "gender": inp.gender,
        "birthDate": safe_birth_date(inp.birth_date),
    }
    return compact(patient)

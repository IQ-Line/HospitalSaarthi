"""``build_allergy_intolerance`` — Layer-1 AllergyIntolerance resource builder.

A ``None`` input produces the "No known allergies" sentinel resource (mirrors
legacy ``bundle.js``).

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/allergyintolerance.html
"""

from __future__ import annotations

from ..inputs import AllergyInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import AllergyIntolerance, FhirReference

_AI_CLINICAL = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical"
_AI_VERIFICATION = "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification"

_NO_KNOWN_ALLERGY_TEXT = "No known allergy"
_NO_KNOWN_ALLERGY_NOTE = "The patient reports no known allergies."


def build_allergy_intolerance(
    inp: AllergyInput | None,
    *,
    resource_id: str,
    patient: FhirReference,
    recorder: FhirReference | None = None,
    recorded_date: str,
) -> AllergyIntolerance:
    """Build an ``AllergyIntolerance`` resource.

    ``clinicalStatus`` active, ``verificationStatus`` confirmed. When ``inp`` is
    ``None`` a "No known allergy" sentinel is emitted; otherwise ``code.text``
    is the allergy text and a note is built from reaction/severity.
    """
    allergy: AllergyIntolerance = {
        "resourceType": "AllergyIntolerance",
        "id": resource_id,
        "meta": {"profile": [resource_profile("AllergyIntolerance")]},
        "clinicalStatus": {
            "coding": [{"system": _AI_CLINICAL, "code": "active", "display": "Active"}],
            "text": "Active",
        },
        "verificationStatus": {
            "coding": [{"system": _AI_VERIFICATION, "code": "confirmed", "display": "Confirmed"}],
            "text": "Confirmed",
        },
        "patient": patient,
        "recordedDate": recorded_date,
    }

    if recorder is not None:
        allergy["recorder"] = recorder

    if inp is None:
        allergy["code"] = {"text": _NO_KNOWN_ALLERGY_TEXT}
        allergy["note"] = [{"text": _NO_KNOWN_ALLERGY_NOTE}]
    else:
        allergy["code"] = {"text": inp.text}
        note_parts = [part for part in (inp.reaction, inp.severity) if part]
        if note_parts:
            allergy["note"] = [{"text": " - ".join(note_parts)}]

    return compact(allergy)

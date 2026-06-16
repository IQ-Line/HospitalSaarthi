"""``build_condition`` — Layer-1 Condition resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/condition.html
"""

from __future__ import annotations

from ..lib import compact
from ..profile_registry import resource_profile
from ..types import Condition, FhirReference

_CONDITION_CLINICAL = "http://terminology.hl7.org/CodeSystem/condition-clinical"
_CONDITION_VER_STATUS = "http://terminology.hl7.org/CodeSystem/condition-ver-status"
_CONDITION_CATEGORY = "http://terminology.hl7.org/CodeSystem/condition-category"


def build_condition(
    *,
    resource_id: str,
    text: str,
    subject: FhirReference,
    certainty: str | None = None,
    category_problem_list: bool = False,
    recorded_date: str | None = None,
) -> Condition:
    """Build a ``Condition`` resource.

    ``clinicalStatus`` is always ``active``; ``verificationStatus`` is derived
    from ``certainty`` (``confirmed`` → confirmed, anything else → provisional)
    when given; a problem-list-item category is added when the flag is set.
    """
    condition: Condition = {
        "resourceType": "Condition",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Condition")]},
        "clinicalStatus": {
            "coding": [{"system": _CONDITION_CLINICAL, "code": "active", "display": "Active"}],
            "text": "Active",
        },
        "code": {"text": text},
        "subject": subject,
    }

    if certainty:
        confirmed = certainty == "confirmed"
        condition["verificationStatus"] = {
            "coding": [
                {
                    "system": _CONDITION_VER_STATUS,
                    "code": "confirmed" if confirmed else "provisional",
                    "display": "Confirmed" if confirmed else "Provisional",
                }
            ],
            "text": "Confirmed" if confirmed else "Provisional",
        }

    if category_problem_list:
        condition["category"] = [
            {
                "coding": [
                    {
                        "system": _CONDITION_CATEGORY,
                        "code": "problem-list-item",
                        "display": "Problem List Item",
                    }
                ]
            }
        ]

    if recorded_date:
        condition["recordedDate"] = recorded_date

    return compact(condition)

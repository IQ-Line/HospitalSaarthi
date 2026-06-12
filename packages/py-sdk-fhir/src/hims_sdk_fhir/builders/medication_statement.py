"""``build_medication_statement`` — Layer-1 MedicationStatement resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/medicationstatement.html
"""

from __future__ import annotations

from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirReference, MedicationStatement


def build_medication_statement(
    *,
    resource_id: str,
    text: str,
    subject: FhirReference,
    effective: str | None = None,
) -> MedicationStatement:
    """Build a ``MedicationStatement`` (``status: active``)."""
    statement: MedicationStatement = {
        "resourceType": "MedicationStatement",
        "id": resource_id,
        "meta": {"profile": [resource_profile("MedicationStatement")]},
        "status": "active",
        "medicationCodeableConcept": {"text": text},
        "subject": subject,
    }
    if effective is not None:
        statement["effectiveDateTime"] = effective
    return compact(statement)

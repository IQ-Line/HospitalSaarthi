"""``build_medication_request`` — Layer-1 MedicationRequest resource builder.

Mirrors the dosage-text / timing construction in legacy ``bundle.js``.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/medicationrequest.html
"""

from __future__ import annotations

from typing import Any

from ..inputs import MedicineInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirReference, MedicationRequest

_UCUM = "http://unitsofmeasure.org"

_FREQUENCY_REPEAT: dict[str, int] = {
    "once daily": 1,
    "twice daily": 2,
    "thrice daily": 3,
    "four times daily": 4,
}

_DAY_PARTS = ("morning", "afternoon", "evening")


def _medication_text(inp: MedicineInput) -> str:
    """``"name (form) (strength)"`` with empty parens omitted."""
    text = inp.name
    if inp.form:
        text += f" ({inp.form})"
    if inp.strength:
        text += f" ({inp.strength})"
    return text


def _dosage_parts(inp: MedicineInput) -> list[str]:
    parts: list[str] = []
    if inp.dosage:
        dose_segments: list[str] = []
        for index, segment in enumerate(inp.dosage.split("-")):
            segment = segment.strip()
            try:
                amount = int(segment)
            except ValueError:
                continue
            if amount > 0 and index < len(_DAY_PARTS):
                dose_segments.append(f"{segment} {_DAY_PARTS[index]}")
        if dose_segments:
            parts.append(", ".join(dose_segments))
    if inp.frequency:
        parts.append(inp.frequency)
    if inp.duration_days:
        parts.append(f"for {inp.duration_days} days")
    if inp.sos:
        parts.append(inp.sos)
    if inp.route:
        parts.append(f"Route: {inp.route}")
    if inp.method:
        parts.append(f"Method: {inp.method}")
    return parts


def _timing(inp: MedicineInput) -> dict[str, Any] | None:
    repeat: dict[str, Any] = {}
    if inp.duration_days:
        repeat["boundsDuration"] = {
            "value": inp.duration_days,
            "unit": "days",
            "system": _UCUM,
            "code": "d",
        }
    if inp.frequency:
        freq = _FREQUENCY_REPEAT.get(inp.frequency.lower().strip())
        if freq is None:
            for key, value in _FREQUENCY_REPEAT.items():
                if key in inp.frequency.lower():
                    freq = value
                    break
        if freq is not None:
            repeat["frequency"] = freq
            repeat["period"] = 1
            repeat["periodUnit"] = "d"
    if not repeat:
        return None
    return {"repeat": repeat}


def build_medication_request(
    inp: MedicineInput,
    *,
    resource_id: str,
    subject: FhirReference,
    requester: FhirReference,
    authored_on: str,
    reason_reference: FhirReference | None = None,
) -> MedicationRequest:
    """Build a ``MedicationRequest`` (``status: active``, ``intent: order``)."""
    dosage_parts = _dosage_parts(inp)
    dosage_text = ", ".join(dosage_parts) if dosage_parts else "As directed"
    dosage_entry: dict[str, Any] = {"text": dosage_text}
    if inp.route:
        dosage_entry["route"] = {"text": inp.route}
    if inp.method:
        dosage_entry["method"] = {"text": inp.method}
    timing = _timing(inp)
    if timing is not None:
        dosage_entry["timing"] = timing
    if inp.sos:
        dosage_entry["additionalInstruction"] = [{"text": inp.sos}]

    request: MedicationRequest = {
        "resourceType": "MedicationRequest",
        "id": resource_id,
        "meta": {"profile": [resource_profile("MedicationRequest")]},
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {"text": _medication_text(inp)},
        "subject": subject,
        "authoredOn": authored_on,
        "requester": requester,
        "dosageInstruction": [dosage_entry],
    }

    if reason_reference is not None:
        request["reasonReference"] = [reason_reference]

    if inp.quantity is not None:
        request["dispenseRequest"] = {
            "quantity": {"value": inp.quantity, "unit": inp.form or "tablet"}
        }

    return compact(request)

"""``build_immunization`` — Layer-1 Immunization resource builder.

The composer owns any ``ImmunizationRecommendation`` for ``next_due_date``.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/immunization.html
"""

from __future__ import annotations

from datetime import datetime

from ..inputs import ImmunizationInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirReference, Immunization


def _is_parseable_datetime(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def build_immunization(
    inp: ImmunizationInput,
    *,
    resource_id: str,
    patient: FhirReference,
    now: str,
    manufacturer: FhirReference | None = None,
    performer: FhirReference | None = None,
) -> Immunization:
    """Build an ``Immunization`` resource (``status: completed``).

    ``occurrenceDateTime`` is ``date`` (or ``now`` when absent); an unparseable
    ``date`` falls back to ``occurrenceString``. ``protocolApplied`` carries the
    dose number when given; manufacturer/performer references when given.
    """
    immunization: Immunization = {
        "resourceType": "Immunization",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Immunization")]},
        "status": "completed",
        "vaccineCode": {"text": inp.vaccine_name},
        "patient": patient,
    }

    if inp.date is None:
        immunization["occurrenceDateTime"] = now
    elif _is_parseable_datetime(inp.date):
        immunization["occurrenceDateTime"] = inp.date
    else:
        immunization["occurrenceString"] = inp.date

    if inp.lot_number:
        immunization["lotNumber"] = inp.lot_number

    if inp.dose_number is not None:
        immunization["protocolApplied"] = [{"doseNumberPositiveInt": inp.dose_number}]

    if manufacturer is not None:
        immunization["manufacturer"] = manufacturer

    if performer is not None:
        immunization["performer"] = [{"actor": performer}]

    return compact(immunization)

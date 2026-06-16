"""``build_organization`` — Layer-1 Organization resource builder.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://hl7.org/fhir/R4/organization.html
"""

from __future__ import annotations

from ..inputs import OrganizationInput
from ..lib import compact
from ..profile_registry import resource_profile
from ..types import FhirIdentifier, Organization

_V2_0203 = "http://terminology.hl7.org/CodeSystem/v2-0203"
_FACILITY_NDHM_SYSTEM = "https://facility.ndhm.gov.in"


def build_organization(inp: OrganizationInput, *, resource_id: str) -> Organization:
    """Build an ``Organization`` resource.

    Emits a facility identifier (v2-0203 ``PRN``) when ``facility_id`` is given
    (``system`` from ``identifier_system`` or the NDHM facility default) and
    work phone/email telecoms when present.
    """
    identifiers: list[FhirIdentifier] = []
    if inp.facility_id:
        identifiers.append(
            {
                "type": {
                    "coding": [
                        {
                            "system": _V2_0203,
                            "code": "PRN",
                            "display": "Provider number",
                        }
                    ]
                },
                "system": inp.identifier_system or _FACILITY_NDHM_SYSTEM,
                "value": inp.facility_id,
            }
        )

    telecom = []
    if inp.phone:
        telecom.append({"system": "phone", "value": inp.phone, "use": "work"})
    if inp.email:
        telecom.append({"system": "email", "value": inp.email, "use": "work"})

    organization: Organization = {
        "resourceType": "Organization",
        "id": resource_id,
        "meta": {"profile": [resource_profile("Organization")]},
        "identifier": identifiers,
        "name": inp.name,
        "telecom": telecom,
    }
    return compact(organization)

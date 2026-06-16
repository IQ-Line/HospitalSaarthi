"""NRCeS profile registry — Python mirror of the TS `NRCeS_PROFILES` constant.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
@see https://nrces.in/ndhm/fhir/r4/index.html
"""

from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True)
class NrcesProfile:
    """A pinned NRCeS profile reference."""

    canonical_url: str
    version: str


# Document Bundle wrapper profile + default confidentiality, stamped on the
# Bundle.meta by the HI-Type composers (mirrors legacy bundle.js).
DOCUMENT_BUNDLE_PROFILE: Final[str] = (
    "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"
)
DOCUMENT_BUNDLE_PROFILE_VERSION: Final[str] = "2.0.0"
CONFIDENTIALITY_SECURITY: Final[dict[str, str]] = {
    "system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
    "code": "V",
    "display": "very restricted",
}


NRCES_PROFILES: Final[dict[str, NrcesProfile]] = {
    "OpConsultRecord": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/OPConsultRecord",
        version="2.0.0",
    ),
    "Prescription": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord",
        version="2.0.0",
    ),
    "DischargeSummary": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/DischargeSummaryRecord",
        version="2.0.0",
    ),
    "DiagnosticReport": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord",
        version="2.0.0",
    ),
    "HealthDocumentRecord": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/HealthDocumentRecord",
        version="2.0.0",
    ),
    "ImmunizationRecord": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/ImmunizationRecord",
        version="2.0.0",
    ),
    "WellnessRecord": NrcesProfile(
        canonical_url="https://nrces.in/ndhm/fhir/r4/StructureDefinition/WellnessRecord",
        version="2.0.0",
    ),
}


_RESOURCE_PROFILE_BASE: Final[str] = "https://nrces.in/ndhm/fhir/r4/StructureDefinition"

# Resource-level NRCeS profiles — bare canonical URL (NO ``|version``), matching
# what the NRCeS IG accepts and what legacy bundle.js emitted for resources.
RESOURCE_PROFILES: Final[dict[str, str]] = {
    name: f"{_RESOURCE_PROFILE_BASE}/{name}"
    for name in (
        "Patient",
        "Practitioner",
        "Organization",
        "Encounter",
        "Condition",
        "Observation",
        "MedicationRequest",
        "MedicationStatement",
        "AllergyIntolerance",
        "Immunization",
        "ImmunizationRecommendation",
        "DocumentReference",
        "Procedure",
        "ServiceRequest",
        "Binary",
    )
}


def resource_profile(resource_type: str) -> str:
    """Return the bare NRCeS canonical profile URL for ``resource_type``.

    Raises ``KeyError`` if the resource type has no registered profile.
    """
    return RESOURCE_PROFILES[resource_type]

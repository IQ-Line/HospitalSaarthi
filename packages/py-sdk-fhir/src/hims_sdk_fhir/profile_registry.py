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

"""hims_sdk_fhir — Python mirror of @hims/ts-sdk-fhir.

See ADR-0023 (docs/architecture/adr/0023-distributed-fhir-assembly.md).

Foundation layer: FHIR R4 type subset, domain input dataclasses, profile
registry, and the pure builder primitives (uuids, clocks, narratives,
reference rewriting, canonical JSON, compaction). Resource builders and
HI-Type composers are added by later waves.
"""

from .identifiers import (
    ABHA_ADDRESS_SYSTEM_URI,
    ABHA_NUMBER_SYSTEM_URI,
    MRN_SYSTEM_URI,
)
from .inputs import (
    AllergyInput,
    ChiefComplaintInput,
    DiagnosisInput,
    DocumentInput,
    EncounterInput,
    HealthDocumentInput,
    ImmunizationBundleInput,
    ImmunizationInput,
    LegacyVitalsInput,
    MedicineInput,
    OpConsultInput,
    OrganizationInput,
    PatientInput,
    PractitionerInput,
    PrescriptionInput,
    VitalSignInput,
)
from .lib import (
    IST,
    Clock,
    UuidFactory,
    build_reference_map,
    canonical_json,
    compact,
    default_clock,
    default_uuid_factory,
    escape_xml,
    generated_narrative,
    rewrite_references_in_place,
    safe_birth_date,
    to_fhir_datetime,
)
from .profile_registry import (
    CONFIDENTIALITY_SECURITY,
    DOCUMENT_BUNDLE_PROFILE,
    DOCUMENT_BUNDLE_PROFILE_VERSION,
    NRCES_PROFILES,
    RESOURCE_PROFILES,
    NrcesProfile,
    resource_profile,
)

# Later waves add: from .builders import ...; from .hi_types import ...

__all__ = [
    # identifiers
    "ABHA_ADDRESS_SYSTEM_URI",
    "ABHA_NUMBER_SYSTEM_URI",
    "MRN_SYSTEM_URI",
    # profile registry
    "NRCES_PROFILES",
    "NrcesProfile",
    "RESOURCE_PROFILES",
    "resource_profile",
    "DOCUMENT_BUNDLE_PROFILE",
    "DOCUMENT_BUNDLE_PROFILE_VERSION",
    "CONFIDENTIALITY_SECURITY",
    # input dataclasses
    "PatientInput",
    "PractitionerInput",
    "OrganizationInput",
    "EncounterInput",
    "DiagnosisInput",
    "ChiefComplaintInput",
    "MedicineInput",
    "AllergyInput",
    "VitalSignInput",
    "LegacyVitalsInput",
    "ImmunizationInput",
    "DocumentInput",
    "OpConsultInput",
    "PrescriptionInput",
    "ImmunizationBundleInput",
    "HealthDocumentInput",
    # lib primitives
    "IST",
    "Clock",
    "UuidFactory",
    "default_clock",
    "default_uuid_factory",
    "to_fhir_datetime",
    "safe_birth_date",
    "canonical_json",
    "compact",
    "build_reference_map",
    "rewrite_references_in_place",
    "generated_narrative",
    "escape_xml",
]

__version__ = "0.1.0"

"""hims_sdk_fhir — Python mirror of @hims/ts-sdk-fhir.

See ADR-0023 (docs/architecture/adr/0023-distributed-fhir-assembly.md).

Skeleton package. Builders, validators, and canonical JSON are not yet
implemented; only the profile registry and identifier constants are populated.
"""

from .identifiers import (
    ABHA_ADDRESS_SYSTEM_URI,
    ABHA_NUMBER_SYSTEM_URI,
    MRN_SYSTEM_URI,
)
from .profile_registry import NRCES_PROFILES, NrcesProfile

__all__ = [
    "ABHA_ADDRESS_SYSTEM_URI",
    "ABHA_NUMBER_SYSTEM_URI",
    "MRN_SYSTEM_URI",
    "NRCES_PROFILES",
    "NrcesProfile",
]

__version__ = "0.1.0"

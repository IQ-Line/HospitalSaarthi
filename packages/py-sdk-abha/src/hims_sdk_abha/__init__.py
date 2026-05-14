"""hims_sdk_abha — Python mirror of @hims/ts-sdk-abha.

See ADR-0023 (docs/architecture/adr/0023-distributed-fhir-assembly.md).

Skeleton package. Validators, parser, FHIR mapping, and FSM state constants
are not yet implemented; only minimal type aliases and gateway suffixes are
populated.
"""

from .constants import ABDM_SUFFIX, SBX_SUFFIX
from .types import AbhaAddress, AbhaKycStatus, AbhaNumber

__all__ = [
    "ABDM_SUFFIX",
    "SBX_SUFFIX",
    "AbhaAddress",
    "AbhaKycStatus",
    "AbhaNumber",
]

__version__ = "0.1.0"

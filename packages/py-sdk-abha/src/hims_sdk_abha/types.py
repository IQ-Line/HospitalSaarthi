"""Placeholder ABHA type aliases.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md

When the first Python service touches ABDM, replace these with proper
Pydantic models matching the gateway's documented payload shapes
(see `@hims/ts-sdk-abha/types/abha-profile.ts` for the canonical fields).
"""

from typing import Literal

# Hyphen-stripped 14-digit ABHA Number. Verhoeff checksum to be enforced
# at the validator layer (TODO).
AbhaNumber = str

# `name@suffix` ABHA Address. Suffix-vs-env enforcement is runtime.
AbhaAddress = str

AbhaKycStatus = Literal["verified", "pending", "failed", "not-required"]

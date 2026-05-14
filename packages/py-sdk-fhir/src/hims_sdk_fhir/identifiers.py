"""Identifier system URI constants — Python mirror of the TS counterpart.

@see docs/architecture/adr/0023-distributed-fhir-assembly.md
"""

from typing import Final

# ABHA Number (14-digit health ID).
ABHA_NUMBER_SYSTEM_URI: Final[str] = "https://healthid.ndhm.gov.in"

# ABHA Address (alias@suffix).
ABHA_ADDRESS_SYSTEM_URI: Final[str] = "https://abdm.gov.in/identifier/abha-address"

# Tenant-issued Medical Record Number. Tenants override per their own
# assigning authority.
MRN_SYSTEM_URI: Final[str] = "https://hims.local/identifier/mrn"

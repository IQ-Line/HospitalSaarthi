"""HI-type constants for OPD clinical reports.

These name the health-information types the OPD module produces for ABDM.
``abdm_m2`` uses them to recognise system-generated health-document rows (so they
are not double-published as user uploads).
"""

from __future__ import annotations

OP_CONSULT_HI_TYPE = "OP Consultation Record"
OPD_SLIP_HI_TYPE = "Consultation Notes"

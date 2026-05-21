"""SQLAlchemy models for the OPD module.

Re-export ``Base`` so Alembic's ``target_metadata`` discovery picks up every
table declared under ``opd.models``.
"""

from opd.models.base import Base
from opd.models.prescription import PrescriptionModel  # noqa: F401 — register tables for Alembic

__all__ = ["Base", "PrescriptionModel"]

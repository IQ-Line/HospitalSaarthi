"""Separate ORM metadata for phase-0 JSONB prescription rows.

The normalized ``PrescriptionModel`` aggregate uses ``Base.metadata``. Legacy
handlers still map the old ``prescriptions`` shape during transition; keeping a
second metadata avoids SQLAlchemy's duplicate-table error when both stacks load.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

from opd.core.schemas import SCHEMA

legacy_metadata = MetaData(schema=SCHEMA)


class LegacyBase(DeclarativeBase):
    metadata = legacy_metadata

from __future__ import annotations

from sqlalchemy.dialects.postgresql import ENUM

from opd.core.schemas import SCHEMA

# Bind to existing Postgres enum (see integration-platform ERD / opd.prescription_status).
prescription_status_pg = ENUM(
    "draft",
    "final",
    "cancelled",
    name="prescription_status",
    schema=SCHEMA,
    create_type=False,
)

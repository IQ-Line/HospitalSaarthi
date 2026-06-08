"""Repair OPD Alembic version tracking when schema and revision history diverge."""

from __future__ import annotations

import subprocess
import sys

from sqlalchemy import create_engine, text

from opd.core.config import get_settings

REVISION_0001 = "0001_opd_visits_prescriptions"
REVISION_0002 = "0002_rx_doctor_vitals"
REVISION_0003 = "0003_prescription_form_data"
REVISION_001 = "001_prescription_schema"
REVISION_002_HD = "002_health_documents"
SCHEMA = "opd"
VERSION_TABLE = "alembic_version"


def _table_exists(conn, schema: str, table: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = :schema AND table_name = :table
                )
                """
            ),
            {"schema": schema, "table": table},
        ).scalar()
    )


def _column_exists(conn, schema: str, table: str, column: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_schema = :schema
                    AND table_name = :table
                    AND column_name = :column
                )
                """
            ),
            {"schema": schema, "table": table, "column": column},
        ).scalar()
    )


def _alembic_versions(conn) -> set[str]:
    if not _table_exists(conn, SCHEMA, VERSION_TABLE):
        return set()
    rows = conn.execute(
        text(f"SELECT version_num FROM {SCHEMA}.{VERSION_TABLE}")
    ).fetchall()
    return {row[0] for row in rows}


def _run_alembic(*args: str) -> None:
    subprocess.run(["uv", "run", "alembic", *args], check=True)


def _stamp(revision: str) -> None:
    print(f"[opd] repairing Alembic baseline → stamp {revision}", file=sys.stderr)
    _run_alembic("stamp", revision)


def repair() -> None:
    engine = create_engine(get_settings().database_url)
    with engine.connect() as conn:
        if not _table_exists(conn, SCHEMA, "visits"):
            return

        versions = _alembic_versions(conn)

        if len(versions) == 0:
            if _column_exists(conn, SCHEMA, "prescriptions", "form_data"):
                target = (
                    REVISION_0003
                    if _column_exists(conn, SCHEMA, "prescriptions", "doctor_id")
                    else REVISION_0001
                )
            elif _column_exists(conn, SCHEMA, "prescriptions", "doctor_id"):
                target = REVISION_0002
            elif _table_exists(conn, SCHEMA, "prescription_medicines"):
                target = REVISION_002_HD
            else:
                target = REVISION_0001
            _stamp(target)
            versions = _alembic_versions(conn)

        create_rx_applied = bool(
            versions & {REVISION_001, REVISION_002_HD}
            or _table_exists(conn, SCHEMA, "prescription_medicines")
        )
        pharmacy_branch_applied = bool(
            versions & {REVISION_0002, REVISION_0003}
        )

        if create_rx_applied and not pharmacy_branch_applied:
            if _column_exists(conn, SCHEMA, "prescriptions", "doctor_id"):
                _stamp(REVISION_0003)


if __name__ == "__main__":
    repair()

"""Repair OPD Alembic version tracking when ``opd`` schema exists without ``alembic_version_opd``."""

from __future__ import annotations

import subprocess
import sys

from sqlalchemy import create_engine, text

from opd.core.config import get_settings

REVISION_0001 = "0001_opd_visits_prescriptions"
REVISION_0002 = "0002_rx_doctor_vitals"
REVISION_0003 = "0003_prescription_form_data"
VERSION_TABLE = "alembic_version_opd"


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
    if not _table_exists(conn, "public", VERSION_TABLE):
        return set()
    rows = conn.execute(text(f"SELECT version_num FROM public.{VERSION_TABLE}")).fetchall()
    return {row[0] for row in rows}


def _run_alembic(*args: str) -> None:
    subprocess.run(["uv", "run", "alembic", *args], check=True)


def repair() -> None:
    engine = create_engine(get_settings().database_url)
    with engine.connect() as conn:
        if not _table_exists(conn, "opd", "visits"):
            return

        versions = _alembic_versions(conn)
        if len(versions) > 0:
            return

        if _column_exists(conn, "opd", "prescriptions", "form_data"):
            target = REVISION_0003 if _column_exists(conn, "opd", "prescriptions", "doctor_id") else REVISION_0001
        elif _column_exists(conn, "opd", "prescriptions", "doctor_id"):
            target = REVISION_0002
        else:
            target = REVISION_0001

        print(f"[opd] repairing Alembic baseline → stamp {target}", file=sys.stderr)
        _run_alembic("stamp", target)


if __name__ == "__main__":
    repair()

"""Repair Alembic version tracking for databases bootstrapped without ``public.alembic_version``.

Shared Azure / legacy databases may already contain ``global_master`` catalog DDL and seed
data while Alembic history was never recorded. ``alembic upgrade heads`` then tries to
re-run ``001_initial_schema`` and fails with duplicate tables.

This script is idempotent and safe to run before every ``alembic upgrade heads``.
"""

from __future__ import annotations

import subprocess
import sys

from sqlalchemy import create_engine, text

from app.core.config import get_settings

BASELINE_REVISION = "039_registration_picklists_seed"
PHARMACY_REVISION = "040_pharmacy_catalog"
ORPHAN_DEPARTMENTS_REVISION = "026_departments_catalog"


def _table_exists(conn, schema: str, table: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = :schema AND table_name = :table
            )
            """
        ),
        {"schema": schema, "table": table},
    ).scalar()
    return bool(row)


def _column_exists(conn, schema: str, table: str, column: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = :schema
                AND table_name = :table
                AND column_name = :column
            )
            """
        ),
        {"schema": schema, "table": table, "column": column},
    ).scalar()
    return bool(row)


def _module_exists(conn, slug: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM global_master.modules
              WHERE slug = :slug AND NOT is_deleted
            )
            """
        ),
        {"slug": slug},
    ).scalar()
    return bool(row)


def _picklist_exists(conn, slug: str) -> bool:
    row = conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1
              FROM global_master.picklist
              WHERE slug = :slug AND NOT is_deleted
            )
            """
        ),
        {"slug": slug},
    ).scalar()
    return bool(row)


def _alembic_versions(conn) -> set[str]:
    if not _table_exists(conn, "public", "alembic_version"):
        return set()
    rows = conn.execute(text("SELECT version_num FROM public.alembic_version")).fetchall()
    return {row[0] for row in rows}


def _run_alembic(*args: str) -> None:
    subprocess.run(["uv", "run", "alembic", *args], check=True)


def repair() -> None:
    engine = create_engine(get_settings().database_url)
    with engine.connect() as conn:
        has_modules = _table_exists(conn, "global_master", "modules")
        versions = _alembic_versions(conn)

        if not has_modules:
            return

        if len(versions) == 0:
            if (
                _column_exists(conn, "global_master", "picklist_values", "is_global")
                and _picklist_exists(conn, "visit-types")
            ):
                print(
                    f"[master-data] repairing Alembic baseline → stamp {BASELINE_REVISION}",
                    file=sys.stderr,
                )
                _run_alembic("stamp", BASELINE_REVISION)
                versions = {BASELINE_REVISION}
            else:
                print(
                    "[master-data] global_master.modules exists but catalog markers are "
                    "inconclusive — manual Alembic stamp required",
                    file=sys.stderr,
                )
                return

        if PHARMACY_REVISION not in versions and not _module_exists(conn, "dispense"):
            if BASELINE_REVISION in versions or "039_registration_picklists_seed" in versions:
                print(
                    f"[master-data] applying missing pharmacy catalog → upgrade {PHARMACY_REVISION}",
                    file=sys.stderr,
                )
                _run_alembic("upgrade", PHARMACY_REVISION)
                versions.add(PHARMACY_REVISION)

        if (
            ORPHAN_DEPARTMENTS_REVISION not in versions
            and _table_exists(conn, "global_master", "departments")
        ):
            print(
                f"[master-data] stamping orphan branch → {ORPHAN_DEPARTMENTS_REVISION}",
                file=sys.stderr,
            )
            _run_alembic("stamp", ORPHAN_DEPARTMENTS_REVISION)


if __name__ == "__main__":
    repair()

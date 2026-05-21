"""One-off: replace deleted revision ``035_product_l2_catalog_modules`` with ``034_product_l2_catalog_modules``."""

from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, text

OLD = "035_product_l2_catalog_modules"
NEW = "034_product_l2_catalog_modules"


def main() -> int:
    url = os.environ.get(
        "MASTER_DATA_DATABASE_URL",
        "postgresql+psycopg://hims:hims@localhost:5433/hims_dev",
    )
    engine = create_engine(url)
    with engine.begin() as conn:
        before = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY 1")).fetchall()
        print("before:", [r[0] for r in before])

        updated = conn.execute(
            text("UPDATE alembic_version SET version_num = :new WHERE version_num = :old"),
            {"new": NEW, "old": OLD},
        ).rowcount
        if updated == 0 and not any(r[0] == NEW for r in before):
            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:new)"), {"new": NEW})
            print(f"inserted {NEW}")

        after = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY 1")).fetchall()
        print("after:", [r[0] for r in after])
    return 0


if __name__ == "__main__":
    sys.exit(main())

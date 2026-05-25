"""Create missing ``global_master`` platform catalog tables (modules, permissions, …).

Use when ``alembic_version`` is ahead but ``global_master.*`` tables were never created
(e.g. only ``tenant_master`` exists). Then run ``uv run alembic upgrade heads``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "modules" / "master-data"
sys.path.insert(0, str(MD))

for env_file in (MD / ".env", ROOT / ".env"):
    if not env_file.exists():
        continue
    for line in env_file.read_text().splitlines():
        if line.startswith("MASTER_DATA_DATABASE_URL=") and not line.strip().startswith("#"):
            os.environ.setdefault("MASTER_DATA_DATABASE_URL", line.split("=", 1)[1].strip())

url = os.environ.get("MASTER_DATA_DATABASE_URL")
if not url:
    raise SystemExit("MASTER_DATA_DATABASE_URL is not set")

from sqlalchemy import create_engine, inspect, text

from app.models.base import Base
from app.models.department import DepartmentPublicModel
from app.models.module import ModulePublicModel
from app.models.module_permission import ModulePermissionPublicModel
from app.models.permission import PermissionPublicModel
from app.models.system_role import SystemRolePublicModel

PLATFORM_MODELS = (
    DepartmentPublicModel,
    ModulePublicModel,
    PermissionPublicModel,
    SystemRolePublicModel,
    ModulePermissionPublicModel,
)

engine = create_engine(url)
insp = inspect(engine)
existing = set(insp.get_table_names(schema="global_master"))

print("global_master tables before:", sorted(existing) or "(none)")

with engine.begin() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS global_master"))
    for model in PLATFORM_MODELS:
        name = model.__tablename__
        if name in existing:
            print(f"  skip {name} (exists)")
            continue
        print(f"  create global_master.{name}")
        model.__table__.create(conn, checkfirst=True)

insp = inspect(engine)
print("global_master tables after:", sorted(insp.get_table_names(schema="global_master")))

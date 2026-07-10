# Absorbed inventory-catalog alembic migrations (origin/dev)

During the `git merge origin/dev` into `dev--improved-v1`, origin/dev added four
master-data alembic revisions that **cannot run on our DB**: each targets the
pre-rename `global_master` / `tenant_master` schemas (we renamed them to
`master_global` / `master_tenant` in `044_rename_catalog_schemas`), and their
`down_revision` chain forks off `043_...`, creating a **second alembic head**
alongside our rename chain. They were `git rm`'d during reconciliation.

Their **content is not lost** — it must be re-expressed against `master_global`
in the planned alembic squash-to-baseline (cleanup **Wave 4**).

| revision id | down_revision | seeds |
|---|---|---|
| `044_inventory_masters_catalog` | `043_platform_role_types_super_admin_and_admin` | inventory reference masters (categories, UOM, store types, …) in `global_master`/`tenant_master`; L1 `inventory` + L2 `inventory-master` module-catalog tree |
| `045_inventory_operational_catalog` | `044_inventory_masters_catalog` | operational inventory catalog — L1 `inventory` + L2 workflow modules (GRN, indents, stock, transfers) in `global_master` |
| `046_inventory_grn_catalog_fix` | `045_inventory_operational_catalog` | inserts `inventory-grn` L2 module under L1 `inventory` (045 skipped it — display name `GRN` collided with existing `slug = grn`); links CRUD `module_permissions` |
| `047_inventory_operational_module_permissions` | `046_inventory_grn_catalog_fix` | idempotent backfill of operational inventory `module_permissions` (L1 CRUD junctions + any missing L2 links) in `global_master` |

Net effect to re-express against `master_global`: the **inventory L1/L2 module
tree** in the module catalog plus its **`module_permissions`** (CRUD) rows, and
the inventory **reference masters** in `master_global`/`master_tenant`.

## Retrieval (original content)

```
git show origin/dev:modules/master-data/alembic/versions/044_inventory_masters_catalog.py
git show origin/dev:modules/master-data/alembic/versions/045_inventory_operational_catalog.py
git show origin/dev:modules/master-data/alembic/versions/046_inventory_grn_catalog_fix.py
git show origin/dev:modules/master-data/alembic/versions/047_inventory_operational_module_permissions.py
```

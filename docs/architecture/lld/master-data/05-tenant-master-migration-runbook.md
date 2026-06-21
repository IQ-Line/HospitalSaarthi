# Tenant master catalog — migration runbook (PostgreSQL)

**Audience:** Engineers running Master Data Alembic on **local / disposable** `hims_dev` databases.  
**Normative typing:** [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md) — `iq_tenant_id` is a **canonical UUID** in HTTP headers, JSON, and `master_tenant.*` columns.  
**Dual schema context:** [01-catalog-dual-schema.md](./01-catalog-dual-schema.md).

> **Schema rename (issue #91):** the catalog schemas were renamed `global_master` → `master_global` and `tenant_master` → `master_tenant`. Existing databases are migrated in place by revision `044_rename_catalog_schemas`; fresh databases are created with the new names directly. The `DROP SCHEMA` reset below drops **both** the old and new names so it works on a database created before or after the rename.

## 1. Goal state

After `alembic upgrade head` on PostgreSQL:

- **`master_global`:** Global catalog tables (platform + Visitpad) **without** `iq_tenant_id`.
- **`master_tenant`:** Parallel catalog tables with **`iq_tenant_id UUID NOT NULL`** on every tenant-scoped row.
- **`public.alembic_version`:** Alembic revision tracking only.

## 2. Fresh database (recommended)

No in-place migration from legacy `public` or `master_data` schemas. Drop and recreate (drops both pre- and post-#91 schema names):

```bash
psql "$MASTER_DATA_DATABASE_URL" -c "
  DROP SCHEMA IF EXISTS master_global CASCADE;
  DROP SCHEMA IF EXISTS master_tenant CASCADE;
  DROP SCHEMA IF EXISTS global_master CASCADE;
  DROP SCHEMA IF EXISTS tenant_master CASCADE;
  DROP TABLE IF EXISTS public.alembic_version CASCADE;
"
cd modules/master-data && uv run alembic upgrade head
```

Revisions **`013_tm_tenant_id_int`**, **`019_tm_iq_tenant_id_col`**, and **`022_tm_iq_tenant_uuid`** are **no-ops** on this path; tenant keys are UUID **`iq_tenant_id`** from **`011`** / **`012`** onward.

## 3. After upgrade — verification

1. **Alembic version:** `SELECT version_num FROM public.alembic_version;` — expect head (e.g. **`025_visitpad_templates_catalog_manage`**).
2. **Column type:**

   ```sql
   SELECT table_schema, table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'master_tenant'
     AND column_name = 'iq_tenant_id'
   ORDER BY table_name;
   ```

   Expect **`uuid`** on all tenant catalog tables.

3. **No global `modules` in `public`:**

   ```sql
   SELECT schemaname, tablename FROM pg_tables
   WHERE tablename = 'modules'
     AND schemaname IN ('public', 'master_global', 'master_tenant');
   ```

   Expect rows for **`master_global`** and **`master_tenant`** only.

## 4. Application contract

- Omit **`iq_tenant_id`** header → read/write **`master_global`**.
- Send canonical UUID in **`iq_tenant_id`** → read/write **`master_tenant`** with that key.
- Non-UUID header values → **400** (no silent fallback to global catalog).

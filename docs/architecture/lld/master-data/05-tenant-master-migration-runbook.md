# Tenant master catalog — migration runbook (PostgreSQL)

**Audience:** Engineers running Master Data Alembic on **local / disposable** `hims_dev` databases.  
**Normative typing:** [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md) — `iq_tenant_id` is a **canonical UUID** in HTTP headers, JSON, and `tenant_master.*` columns.  
**Dual schema context:** [01-catalog-dual-schema.md](./01-catalog-dual-schema.md).

## 1. Goal state

After `alembic upgrade head` on PostgreSQL:

- **`global_master`:** Global catalog tables (platform + Visitpad) **without** `iq_tenant_id`.
- **`tenant_master`:** Parallel catalog tables with **`iq_tenant_id UUID NOT NULL`** on every tenant-scoped row.
- **`global_master.alembic_version`:** Alembic revision tracking only (not `public` — production DB roles often cannot CREATE there).

## 2. Fresh database (recommended)

No in-place migration from legacy `public` or `master_data` schemas. Drop and recreate:

```bash
psql "$MASTER_DATA_DATABASE_URL" -c "
  DROP SCHEMA IF EXISTS global_master CASCADE;
  DROP SCHEMA IF EXISTS tenant_master CASCADE;
  DROP TABLE IF EXISTS global_master.alembic_version CASCADE;
"
cd modules/master-data && uv run alembic upgrade head
```

Revisions **`013_tm_tenant_id_int`**, **`019_tm_iq_tenant_id_col`**, and **`022_tm_iq_tenant_uuid`** are **no-ops** on this path; tenant keys are UUID **`iq_tenant_id`** from **`011`** / **`012`** onward.

## 3. After upgrade — verification

1. **Alembic version:** `SELECT version_num FROM global_master.alembic_version;` — expect head (e.g. **`039_registration_picklists_seed`**).
2. **Column type:**

   ```sql
   SELECT table_schema, table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'tenant_master'
     AND column_name = 'iq_tenant_id'
   ORDER BY table_name;
   ```

   Expect **`uuid`** on all tenant catalog tables.

3. **No global `modules` in `public`:**

   ```sql
   SELECT schemaname, tablename FROM pg_tables
   WHERE tablename = 'modules'
     AND schemaname IN ('public', 'global_master', 'tenant_master');
   ```

   Expect rows for **`global_master`** and **`tenant_master`** only.

## 4. Application contract

- Omit **`iq_tenant_id`** header → read/write **`global_master`**.
- Send canonical UUID in **`iq_tenant_id`** → read/write **`tenant_master`** with that key.
- Non-UUID header values → **400** (no silent fallback to global catalog).

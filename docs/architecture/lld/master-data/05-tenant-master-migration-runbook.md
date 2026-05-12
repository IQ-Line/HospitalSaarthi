# Tenant master catalog — migration runbook (PostgreSQL)

**Audience:** DevOps / backend engineers upgrading environments that use Master Data Alembic under `modules/master-data`.  
**Normative typing:** [ADR-0021](../../adr/0021-master-data-catalog-tenant-key-type.md) — `iq_tenant_id` is a **canonical UUID** in HTTP headers, JSON, and `tenant_master.*` columns after revision **`022_tm_iq_tenant_uuid`**.  
**Dual schema context:** [01-catalog-dual-schema.md](./01-catalog-dual-schema.md).

## 1. Goal state

After `alembic upgrade head` on PostgreSQL:

- **`public`:** Visitpad and platform global catalog tables as defined by history through **`011`** (Visitpad global rows **without** `iq_tenant_id` / legacy `tenant_id` on `public` Visitpad).
- **`tenant_master`:** Parallel catalog tables with column **`iq_tenant_id`** typed as **`UUID NOT NULL`** (post-**`022`**), matching the rest of the platform tenant registry.

## 2. Why this runbook exists

The Alembic chain includes **breaking** steps for `tenant_master` data:

| Revision | Risk |
|----------|------|
| **`013_tm_tenant_id_int`** | If `tenant_master` already had UUID-shaped tenant keys, this revision **truncates** catalog tables and coerces the tenant key column to **integer** (legacy intermediate; environments that never shipped `013` still have the revision in history when upgrading from older bases). |
| **`022_tm_iq_tenant_uuid`** | **`TRUNCATE`** on all listed `tenant_master` catalog tables, then **`ALTER COLUMN iq_tenant_id`** from **integer → UUID**. There is **no** integer-to-platform-UUID mapping — **re-seed** tenant-scoped catalog after this step. |

Long-lived branches or partial deploys (DB upgraded, app not, or vice versa) must not assume integer headers or silent “global” fallback for writes: the API rejects **non-UUID** `iq_tenant_id` headers with **400** (see OpenAPI + `get_catalog_scope`).

## 3. Ordered path (do not cherry-pick)

1. Run a **single** upgrade from the DB’s current Alembic head to repository **`head`** — `alembic upgrade head` from `modules/master-data` with the correct `DATABASE_URL` / config.
2. Do **not** apply **`022`** alone on a database that has not run predecessors **`012`–`021`**; revision dependencies are encoded in Alembic (`down_revision` chain).
3. Intervening revisions **`014`–`021`** (Visitpad column tweaks, Alembic version column width, etc.) run as part of the same chain — no separate operator command unless your runbook documents a deliberate pause (e.g. app compatibility window).

## 4. Before production upgrade

- **Backup** the database (or restore window agreed with operations).
- Confirm **application version** deployed after upgrade sends **`iq_tenant_id`** as a **UUID string** (or omits the header for global `public` catalog). The web client blocks Visitpad **writes** without a UUID tenant id when applicable.
- Plan **re-seed** scripts or jobs for any **tenant-scoped** catalog you rely on in `tenant_master` (units, conversions, vitals, vaccines, manufacturers, platform modules copy, etc.) — **`022` empties those rows** (revision **`023`** adds `vaccines` / `manufacturers`; they are empty until seeded).

## 5. After upgrade — verification

1. **Alembic version:** `SELECT version_num FROM alembic_version;` — expect latest revision (e.g. **`023_vp_vaccines_manufacturers`** or newer head).
2. **Column type (PostgreSQL):**

   ```sql
   SELECT table_schema, table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'tenant_master'
     AND column_name = 'iq_tenant_id'
   ORDER BY table_name;
   ```

   Expect **`uuid`** (not `integer`).

3. **Row counts:** `tenant_master` catalog tables should be **empty** immediately after **`022`** unless you already re-seeded. **`public`** Visitpad/global rows are unaffected by **`022`** truncate list (truncate targets `tenant_master` only).

4. **API smoke:**  
   - Omit `iq_tenant_id` → list Visitpad units → **200**, rows from **`public`**, JSON `iq_tenant_id: null` where the schema exposes nullable tenant id.  
   - Send valid UUID for a tenant with seeded `tenant_master` data → **200** and rows scoped to that tenant.  
   - Send header `iq_tenant_id: not-a-uuid` → **400**.

## 6. Re-seed checklist

- [ ] Identify which tenants need `tenant_master` catalog rows (non-default tenants).
- [ ] Run approved seed/import (SQL, admin API, or migration seed scripts) **per tenant UUID** consistent with the identity / tenant registry.
- [ ] Re-run §5 checks for at least one tenant UUID used in integration tests.

## 7. SQLite / CI

Automated tests typically use SQLite with ORM `create_all`; **PostgreSQL-only** steps in **`013`** / **`022`** no-op on SQLite. CI still validates application logic; **staging on PostgreSQL** is required before calling production migration behaviour “verified.”

## 8. Related code

- Truncated table list and upgrade logic: `modules/master-data/alembic/versions/022_tm_iq_tenant_uuid.py`
- Visitpad vaccines / manufacturers DDL: `modules/master-data/alembic/versions/023_vp_vaccines_manufacturers.py`
- Scope parsing: `modules/master-data/app/core/catalog_tenant_id.py`, `app/api/deps.py` (`get_catalog_scope`)

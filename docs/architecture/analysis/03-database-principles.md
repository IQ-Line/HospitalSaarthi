# Database Principles

Ground rules for schema design across all modules. These principles exist to ensure that schemas designed today remain extensible as the platform grows, that modules can be independently deployed and scaled, and that data isolation and query performance hold at AIIMS scale.

This document is intended to be read before the team designs DB diagrams for the core modules.

---

## 1. One Citus Cluster, Separate Schemas Per Module

All modules share a single PostgreSQL cluster managed by Citus. Each module owns a PostgreSQL schema (namespace):

```
PostgreSQL (Citus cluster)
├── schema: user_management    ← User Management module
├── schema: configurator       ← Configurator module
├── schema: empi               ← EMPI / Patient Identity module
├── schema: master_data        ← Master & Tenant Data module
├── schema: opd                ← OPD module
├── schema: billing            ← Billing module (even when embedded as library in OPD process)
└── schema: ...                ← future modules
```

**Why one cluster:** Citus distributes tables by `iq_tenant_id` across worker nodes. All of a tenant's data — across all modules — lands on the same node, making tenant-scoped queries fast regardless of which module's schema they touch. Separate clusters would mean cross-node joins even within a single tenant.

**Why separate schemas:** Logical isolation. A module's Drizzle schema file only defines tables in its own namespace. You cannot accidentally JOIN across modules because the ORM only knows about its own tables. Schema permissions can enforce this with separate database roles per module if hard enforcement is desired.

**When to split to a separate database:** Only when a module's load profile is so different from the rest that it causes noisy-neighbor problems on the shared cluster (e.g., a high-throughput LIMS processing thousands of samples per second with heavy write contention). This is an operational decision made post-measurement, not an upfront design choice. The module's code doesn't change — only its connection config.

---

## 2. Every Table Has `iq_tenant_id` as the Distribution Column

Every table in every module must include `iq_tenant_id` as a column, and it must be the Citus distribution column.

```sql
CREATE TABLE opd.visits (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iq_tenant_id  UUID NOT NULL,
    -- ... module-specific columns
);

SELECT create_distributed_table('opd.visits', 'iq_tenant_id');
```

**Why:** Citus co-locates all rows with the same `iq_tenant_id` on the same worker node. This means:
- All queries filtered by `iq_tenant_id` (which is every query — see principle 3) hit a single node
- JOINs between tables in the same schema with the same `iq_tenant_id` value are local (no cross-node shuffle)
- Tenant data isolation is physical, not just logical

**Compound primary keys:** For tables distributed by `iq_tenant_id`, Citus requires that `iq_tenant_id` be part of any unique constraint or primary key. The pattern is:

```sql
-- Option A: UUID primary key, iq_tenant_id in a separate unique constraint
PRIMARY KEY (id),
UNIQUE (iq_tenant_id, id)

-- Option B: Composite primary key (preferred for Citus)
PRIMARY KEY (iq_tenant_id, id)
```

Option B is cleaner for Citus. It means all foreign keys referencing this table must include `iq_tenant_id`, which reinforces the tenant isolation pattern.

---

## 3. Every Query Includes `iq_tenant_id`

No query should ever scan across tenants. The application layer (tenant context middleware using AsyncLocalStorage, same pattern as the production HIMS) ensures `iq_tenant_id` is injected into every query. Drizzle middleware or a custom query wrapper can enforce this.

**What this prevents:**
- Accidental cross-tenant data leakage (security)
- Full-cluster scans (performance — without `iq_tenant_id`, Citus must scatter the query to all nodes)

**Exception:** Platform-level queries (tenant provisioning, cross-tenant admin dashboards) require explicit superadmin authorization and should use a clearly marked separate query path that bypasses the tenant filter.

---

## 4. No Cross-Schema Foreign Keys

A table in `opd.*` must never have a foreign key referencing a table in `billing.*` or `empi.*`. Cross-module relationships are maintained through:

- **Identifier columns** — store the ID of the referenced entity (e.g., `patient_id UUID` in `opd.visits`), but without a `REFERENCES` constraint
- **Local read projections** — if OPD needs patient name for display, it maintains a `opd.patient_projection` table synced via events from EMPI, and JOINs to that
- **API calls** — if real-time data from another module is needed (e.g., checking patient allergies during prescription), call the owning module's API

**Why:** Foreign keys create deployment coupling. If `opd.visits` has `REFERENCES empi.patients(id)`, you cannot deploy OPD without EMPI's schema existing, you cannot migrate EMPI's schema independently, and you've created a hidden dependency that makes module extraction impossible.

**Within a schema:** Foreign keys between tables in the same schema are fine and encouraged. `opd.prescriptions` referencing `opd.visits` is normal — they're in the same module.

---

## 5. Every Table Has Standard Audit Columns

Every table in every module must include:

```sql
created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
created_by   UUID,        -- user ID from JWT
updated_by   UUID         -- user ID from JWT
```

**Why:** Healthcare regulatory requirements (NABH, DPDP Act) require knowing who created/modified every record and when. Adding these retroactively to tables with millions of rows is painful. Including them from day one costs nothing.

**Don't include:** `deleted_at` (soft delete) by default. Use soft delete only when the domain requires it (e.g., audit trail records that must be retained). For most tables, hard delete with an audit log entry is cleaner.

---

## 6. Extend with New Tables, Not New Required Columns

When a module's data model needs to grow, prefer adding new related tables over adding required columns to existing tables.

**Example — Billing extension:**

```
Phase 1 (day one):
  billing.accounts
  billing.charges
  billing.invoices
  billing.payments

Phase 1.5 (when product stories arrive):
  billing.estimates        ← NEW TABLE, relates to accounts
  billing.deposits         ← NEW TABLE, relates to accounts
  billing.refunds          ← NEW TABLE, relates to payments
  billing.discounts        ← NEW TABLE, relates to invoices or charges
  billing.clearances       ← NEW TABLE, relates to accounts
```

**Why:** Adding a new table with a foreign key to an existing table is a non-breaking change. Existing records in `billing.accounts` simply have zero associated `billing.estimates`. No backfill needed, no default values to invent, no migration that touches millions of rows.

Adding a required column to an existing table requires either a default value (which may be semantically wrong for historical data) or a backfill migration (which locks the table and may require data that was never captured).

**When a new column is fine:** Optional (nullable) columns that enhance existing records without changing semantics. Adding `billing.accounts.insurance_policy_id UUID NULL` is fine — old accounts without insurance simply have NULL.

---

## 7. Use Enums for Status Fields, Define Them Clearly

Status fields drive workflow logic and reporting. Define them as PostgreSQL enums or as `TEXT` with a check constraint:

```sql
-- Option A: PostgreSQL enum (strict, requires ALTER TYPE to add values)
CREATE TYPE opd.visit_status AS ENUM ('registered', 'waiting', 'in_progress', 'completed', 'cancelled');

-- Option B: Text with check constraint (easier to extend)
status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'waiting', 'in_progress', 'completed', 'cancelled'))
```

**Prefer Option B** for the HIMS platform. Enum types cannot have values removed (only added), and `ALTER TYPE ... ADD VALUE` cannot run inside a transaction in PostgreSQL. Text with check constraints is more flexible for a system where status values will evolve as product stories arrive.

**Rule:** Every status field must have its valid values and transitions documented in the module's schema file as comments on the check constraint. Status transitions are the most common source of bugs in healthcare workflows.

---

## 8. Projection Tables Are First-Class Schema Citizens

When a module subscribes to events from another module and maintains a local read projection, the projection table lives in the consuming module's schema and is part of its migration history:

```sql
-- In OPD's schema, maintained by OPD's event consumer
CREATE TABLE opd.patient_projection (
    patient_id     UUID NOT NULL,
    iq_tenant_id   UUID NOT NULL,
    name           TEXT,
    date_of_birth  DATE,
    gender         TEXT,
    abha_number    TEXT,
    last_synced    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (iq_tenant_id, patient_id)
);

SELECT create_distributed_table('opd.patient_projection', 'iq_tenant_id');
```

**Design rules for projections:**
- Name them `*_projection` to distinguish from owned tables
- Include `last_synced` timestamp — useful for debugging stale data
- Index them the same way you'd index any table the module queries
- They are denormalized — include all fields the module needs for its queries, not just IDs
- They are eventual-consistent — the source of truth is always the owning module
- They are rebuildable — if a projection gets corrupted, replay events from the source module to rebuild it. This means the event bus must support replay (or the source module must expose a bulk-read API for initial sync)

---

## 9. Reference Data Tables Are Read-Heavy, Cache-Friendly

Master data (ICD codes, drug formulary, LOINC, SNOMED, procedure codes, fee schedules) is read thousands of times per write. Design for this:

- **Effective-date ranges** for records that change over time (tariffs, fee schedules):
  ```sql
  effective_from  DATE NOT NULL,
  effective_to    DATE,  -- NULL = currently active
  ```
  This preserves historical pricing without modifying existing rows. When a tariff changes, insert a new row with the new `effective_from` and close the old row's `effective_to`.

- **Aggressive caching at the application layer** (24h TTL for code lookups, as specified in the HLD). Cache invalidation via `master-data.updated` events.

- **Tenant overrides** as a separate table, not as columns on the master table:
  ```sql
  master_data.drugs           -- global catalog
  master_data.drug_overrides  -- tenant-specific price/availability overrides, FK to drugs
  ```
  Query pattern: `SELECT * FROM drugs LEFT JOIN drug_overrides ON ... WHERE iq_tenant_id = ?`. Override wins when present.

---

## 10. Sequence Generation Is Tenant-Scoped

Human-readable sequential identifiers (UHID, visit number, bill number) must be unique within a tenant, not globally. The production HIMS's pattern of `${tenantId}:${sequenceName}` for counter keys is the right idea.

In PostgreSQL with Citus:
- **Do not use** `SERIAL` or `SEQUENCE` — these are node-local and don't coordinate across Citus workers
- **Use** a counter table distributed by `iq_tenant_id`:
  ```sql
  CREATE TABLE shared.sequence_counters (
      iq_tenant_id   UUID NOT NULL,
      sequence_name  TEXT NOT NULL,
      current_value  BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (iq_tenant_id, sequence_name)
  );
  ```
  Increment with `UPDATE ... SET current_value = current_value + 1 RETURNING current_value` inside the transaction that creates the record needing the sequence. This is tenant-local (single node) so there's no distributed coordination.

- **UUIDs for internal IDs** — always `gen_random_uuid()`. Sequential IDs are only for human-facing identifiers.

---

## 11. Design for Event Replay and Projection Rebuild

Every module must be able to:
1. **Republish its current state as events** — for a new consumer that needs to build an initial projection
2. **Rebuild its own projections from scratch** — by replaying events from source modules

This means:
- Event consumers must be idempotent (processing the same event twice produces the same result)
- Projection tables must support upsert (`ON CONFLICT ... DO UPDATE`)
- Source modules should expose a bulk-read API (e.g., `GET /patients?modified_since=...`) for initial projection seeding, so new consumers don't need to replay the entire event history

---

## 12. JSON Columns for Truly Unstructured Data Only

PostgreSQL's `JSONB` is powerful but should be used sparingly:

**Good uses:**
- Event payloads stored for audit/replay (the shape varies by event type)
- External system responses (ABDM gateway responses, insurance API responses)
- User-defined custom fields (tenant-specific extensions to a form)

**Bad uses:**
- Structured data you'll query or filter on — use proper columns with types and indexes
- Arrays of nested objects that have a fixed schema — normalize into a related table
- Avoiding schema design ("just throw it in a JSON column") — this creates unqueryable, unindexable data that causes performance problems at scale

**The production HIMS's `Prescription.medicines` array** (nested objects with dosage, substitution info, status) is an example of what should be a related table (`opd.prescription_medicines`) in the new platform, not a JSON array.

---

## 13. PostgreSQL Production Tuning

PostgreSQL ships with defaults designed to start on minimal hardware (`shared_buffers = 128MB`, `work_mem = 4MB`). Every production deployment — and every serious dev environment — needs tuning. This is well-known in the community and documented in the official PostgreSQL wiki. It is not a deficiency; it is an intentional choice to ensure Postgres runs out of the box on any machine. But it means "install and go" will perform poorly under real load.

### Decide during platform foundation (affects code and infra)

**Connection pooler (PgBouncer in transaction mode).** PostgreSQL forks a process per connection. With Citus fanning queries to worker nodes, connection count multiplies. PgBouncer is effectively mandatory for multi-tenant workloads. This is a Phase 0 decision because it affects:
- Connection string configuration in module code
- ORM settings — Drizzle's prepared statements need configuration to work with PgBouncer's transaction mode
- Docker Compose / infrastructure layout from day one

**`pg_stat_statements` extension.** Install in the base image from the start. This extension tracks query performance (execution count, mean/max time, rows returned). Adding it retroactively when something is already slow means you have no baseline to compare against.

**`random_page_cost = 1.1`.** If the cluster runs on SSDs (it will), change this from the default `4.0`. The default assumes spinning disks and causes the query planner to avoid indexes it should use. This is a one-line config change that affects every query plan in the system.

**`citus.shard_count`.** Set at `create_distributed_table()` time and hard to change later. The default of 32 is appropriate for multi-tenant HIMS workloads. Do not change it without measurement.

### Tune at deployment time (no code changes)

These parameters depend on the hardware and can be adjusted without touching application code. Use [PGTune](https://pgtune.leopard.in.ua/) to generate a starting configuration from your server specs, then adjust under load.

| Parameter | Default | Production guideline |
|-----------|---------|---------------------|
| `shared_buffers` | 128 MB | 25% of system RAM |
| `effective_cache_size` | 4 GB | 50–75% of system RAM (planner hint, not allocation) |
| `work_mem` | 4 MB | 32–256 MB depending on query complexity |
| `maintenance_work_mem` | 64 MB | 1–2 GB (speeds up VACUUM, CREATE INDEX) |
| `max_connections` | 100 | Keep low (50–200) when using PgBouncer |
| `huge_pages` | try | Set to `on` for large `shared_buffers` |

### Useful extensions beyond pg_stat_statements

- **`auto_explain`** — automatically logs query plans for queries exceeding a time threshold. Invaluable for diagnosing slow queries in production without manual `EXPLAIN ANALYZE`.
- **`pg_cron`** — scheduled maintenance jobs (Citus includes this). Useful for periodic cleanup, materialized view refresh, and partition maintenance.

### What this means for the team

"PostgreSQL defaults are bad" is a real but solvable problem. The solution is a tuned base configuration committed to the infrastructure repo, not a reason to choose a different database. PGTune generates 90% of the answer in seconds; the remaining 10% is workload-specific tuning done after load testing.

---

## Summary Checklist for Schema Review

Before approving any module's schema design:

- [ ] Every table has `iq_tenant_id` as a column and Citus distribution key
- [ ] Every table has `created_at`, `updated_at`, `created_by`, `updated_by`
- [ ] No foreign keys reference tables in another module's schema
- [ ] Cross-module entity references use plain ID columns (no `REFERENCES`)
- [ ] Projection tables are named `*_projection` and include `last_synced`
- [ ] Status fields use `TEXT` with check constraints, transitions are documented
- [ ] Sequential human-facing IDs use the counter table pattern, not `SERIAL`
- [ ] Internal IDs are UUIDs
- [ ] Effective-date ranges are used for temporal data (tariffs, schedules)
- [ ] JSON columns are justified (not used for structured, queryable data)
- [ ] Extension plan is additive (new tables and optional columns, not new required columns)

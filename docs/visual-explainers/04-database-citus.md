---
title: "Database topology: one Citus cluster, schema-per-module"
objective: How HIMS stores data — a single PostgreSQL+Citus cluster where every module owns its own schema, every table is sharded by tenant, and modules never reach across the schema boundary.
---

There is **one** database: a single PostgreSQL cluster managed by [Citus](https://www.citusdata.com/). Every module owns a dedicated **schema** inside it (`billing.*`, `registration.*`, `empi.*`, …), never `public`. Sharing one cluster keeps a tenant's data co-located on one worker node (fast intra-tenant queries); separate schemas keep modules independently migratable and eventually *separable into their own database* with no code change — only a connection string.

Source of record: [`03-database-principles.md`](../architecture/analysis/03-database-principles.md) §1, [`why-schema-per-module.md`](../guides/why-schema-per-module.md).

<!-- chapter: Topology -->

```diagram title="One cluster, a schema per module, sharded by tenant" look=clean
flowchart TB
  subgraph CL["One PostgreSQL + Citus cluster"]
    direction TB
    subgraph D["DISTRIBUTED — hash-sharded by iq_tenant_id"]
      d1["billing.*"]
      d2["registration.*"]
      d3["empi.*"]
      d4["opd.*"]
      d5["configurator.tenant_modules"]
      d6["record_foundation / pharmacy / inventory / integration_hub"]
    end
    subgraph R["REFERENCE — replicated to every node"]
      r1["configurator.tenants / organizations"]
      r2["user_management.capabilities"]
      r3["master_global.* and master_tenant.* (catalog)"]
    end
    subgraph L["LOCAL — coordinator only, no shard key"]
      l1["auth.* (better-auth: TEXT PKs)"]
    end
  end
```

Every module's schema name is declared in one place — its Drizzle `pgSchema(...)` (TS) or `SCHEMA =` constant (Python):

```code lang=ts file=modules/billing/src/schema/tables.ts hl=2
export const BILLING_SCHEMA_NAME = "billing" as const;
export const billingSchema = pgSchema(BILLING_SCHEMA_NAME);
```

The full set: `user_management` + `auth`, `configurator`, `empi`, `registration`, `record_foundation`, `billing`, `inventory`, `pharmacy`, `integration_hub`, `opd`, and Master Data's **two** schemas `master_global` / `master_tenant` (disjoint by design — [ADR-0020](../architecture/adr/0020-master-data-catalog-dual-schema.md)).

### The three Citus table classes

Which class a table gets is decided in a custom SQL migration (see next chapter). Verified from the real migrations:

| Class | What Citus does | Real tables | Why |
|---|---|---|---|
| **Distributed** | Hash-shards rows by `iq_tenant_id` across workers; a tenant's rows all land on one node | `billing.bills/bill_items/payments/tariff_master`, `registration.*`, `empi.*`, `opd.*`, `configurator.tenant_modules` | Tenant-scoped operational data — the bulk of the platform |
| **Reference** | Full copy on every node; joinable from any shard | `configurator.tenants/organizations/tenant_integration_profiles/tenant_api_keys/sequence_configuration`, `user_management.capabilities/platform_admins`, all `master_global.*` + `master_tenant.*` catalog tables | Small, read-heavy, cross-tenant or FK-target rows |
| **Local** | Stays a plain table on the coordinator, never distributed | `auth.*` (better-auth) | TEXT primary keys, no `iq_tenant_id` shard key — can't be distributed |

```callout tone=warning title="The distribution column is iq_tenant_id, not tenant_id"
`CLAUDE.md` and some prose say "tenant_id on every table", but the **actual column** every distributed/reference table carries is `iq_tenant_id` — added via the shared `tenantColumn()` helper in `@hims/ts-sdk-db` (`packages/ts-sdk-db/src/columns.ts`). Citus requires it to be part of **every** primary key / unique constraint, so PKs are composite: `primaryKey({ columns: [t.iq_tenant_id, t.id] })`. Code wins — grep for `iq_tenant_id`.
```

<!-- chapter: A module's schema -->

Billing is a representative distributed module: four operational tables plus its **own** `sequence_counters` (for human-readable bill/payment/receipt numbers — the Citus-safe counter-table pattern, never `SERIAL`). Note there are **no FK constraints** between billing tables — `bill_id` etc. are plain UUID columns (soft references); the module deliberately carries no cross-table FKs.

```data-model title="billing.* (illustrative — types/columns trimmed)"
. bills
.   iq_tenant_id uuid PK — Citus shard key
.   id uuid PK
.   bill_number text — allocated from sequence_counters
.   patient_id uuid — soft ref to empi, no FK
.   net_amount numeric
.   status text — DRAFT | ... (plain text, not enum)
. bill_items
.   iq_tenant_id uuid PK
.   id uuid PK
.   bill_id uuid — soft ref to bills.id, NO FK constraint
.   item_code text
.   total_amount numeric
. payments
.   iq_tenant_id uuid PK
.   id uuid PK
.   payment_number text — unique per tenant
.   bill_id uuid — nullable soft ref
.   amount numeric
. tariff_master
.   iq_tenant_id uuid PK
.   id uuid PK
.   service_code text
.   base_price numeric
. sequence_counters
.   iq_tenant_id uuid PK
.   sequence_name text PK
.   current_value bigint — UPDATE ... RETURNING, tenant-local
```

<!-- chapter: Cross-schema rules -->

**Two rules, both live** (not aspirational — enforced by `@nx/enforce-module-boundaries` at the code level and swept at the SQL level):

1. **No cross-schema foreign keys** — a table in `opd.*` may never `REFERENCES empi.*`. Store the plain UUID instead.
2. **No cross-schema JOINs / reads from module code** — get another module's data via **events** (async), an **HTTP** call (sync, the default), or a **local projection** table — never a live join across the boundary.

The [cross-schema census](../architecture/cleanup/cross-schema-census.md) (2026-07-09) swept every `modules/*`, `services/*`, `packages/*` tree and found the boundary essentially clean. The only accepted crossings:

| Crossing | Status | Why allowed / gate |
|---|---|---|
| `user_management.users ⋈ auth."user"` | **Documented exception** | UM owns *and* provisions the better-auth `auth` schema (ADR-0003); the join stays inside one service. Invalidated if `auth.*` moves out of UM. |
| dev seeders writing `configurator.*` / reading `master_global.*` | **Documented exception** | Dev-bootstrap scripts under `src/dev/` only; never in a service boot path. Invalidated if imported from a non-dev entrypoint. |
| `opd → registration / empi / configurator` reads | **Tracked violation (reach-in #2)** | Deferred *with a gate* — waiting on the async event bridge, logged in the cleanup master-map, not silently accepted. |
| `configurator → master_global.modules` JOIN | **Fixed** | Replaced with a narrow internal HTTP route (`223d7818`) — the canonical example of doing it right. |

<!-- chapter: Migrations & reset -->

Each module owns and runs its own migrations — no cross-module ordering dependency (no cross-schema FKs means order is independent):

```filetree
. modules/billing/migrations/          — TS module: drizzle-kit, journaled
.   0000_init.sql
.   0001_distribute_citus.sql          — custom SQL: create_distributed_table calls
.   0004_distribute_sequence_counters.sql
. modules/opd/alembic/versions/        — Python module: alembic
.   0001_baseline.py                   — squashed; runs PERFORM create_distributed_table
```

Drizzle-kit journals migrations (a `meta/` journal makes each run exactly once); Python modules (`opd`, `master-data`) use Alembic. **Migrations are disposable pre-prod** — this branch squashed the Python chains to a single `0001_baseline` and reshaped several SQL migrations. A DB created before a squash carries a stale `alembic_version` that no longer resolves; the fix is always a full reset, never hand-patching.

```callout tone=warning title="Citus migration gotchas (all seen in this repo)"
- **Distribute before you FK.** Reference-table FK targets must be registered *first*, then dependents — see the ordered `create_reference_table(...)` block in `configurator/migrations/0001_distribute_citus.sql`. FK cycles that can't be declared in `tables.ts` are added in a later custom migration *after* both sides are distributed (`inventory/migrations/0002`).
- **`ON DELETE SET NULL` is impossible when the FK includes the shard key.** Citus rejects it (`EnsureSupportedFKeyOnDistKey`); `NO ACTION` is the closest allowed behaviour — the four ported SET NULL FKs became NO ACTION.
- **Distribution lives in custom SQL, not in `tables.ts`.** `create_distributed_table` / `create_reference_table` calls are hand-written `.sql` (TS) or `PERFORM` in the Alembic baseline (Python). Drizzle-kit won't generate them.
```

**Resetting a dev box** — one command drops the volumes and rebuilds from clean (`Makefile`):

```steps
# make db-reset
reuse Makefile — db-reset target
> Runs: `docker compose down -v` (drop volumes) → `make infra` (recreate PostgreSQL+Citus, PgBouncer, Cerbos) → `_wait-healthy` → `make db-migrate` (every module, foundation-first) → `make seed`.
> First-time setup instead: `make setup` (env + deps + infra + migrate + seed).
```

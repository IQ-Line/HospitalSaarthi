# Why modules own separate PostgreSQL schemas (and why cross-schema FKs are banned)

**Origin:** [GitHub issue #26](https://github.com/IQ-Line/HospitalSaarthi/issues/26), filed after PR #17 moved Master Data's tables from a dedicated schema into `public`. This doc replaces the issue as the permanent reference — it verifies every claim against the current tree and updates anything the issue got ahead of (the dual global/tenant schema split in particular postdates it).

## Two separate rules

| Rule | What it means |
|------|---------------|
| **Schema-per-module** | Each module's tables live in their own PostgreSQL schema (`opd.*`, `empi.*`, `master_global.*`), never in `public`. |
| **No cross-schema FKs/JOINs** | A table in one module's schema cannot have a foreign key into another module's schema, and modules should not JOIN across schema boundaries at runtime. |

The first is about *where tables live*; the second is about *how modules read each other's data*. Both are live rules, not aspirational — see the schemas below and the enforcement evidence in §4.

## 1. Current schema layout

All modules share one Citus-managed PostgreSQL cluster; each owns a namespace:

```
modules/user-management/src/schema/tables.ts   → pgSchema("user_management")
modules/configurator/src/schema/tables.ts      → pgSchema("configurator")
modules/empi/src/schema/tables.ts              → pgSchema("empi")
modules/registration/src/schema/tables.ts      → pgSchema("registration")
modules/record-foundation/src/schema/tables.ts → pgSchema("record_foundation")
modules/billing/src/schema/tables.ts           → BILLING_SCHEMA_NAME ("billing")
modules/inventory/src/schema/tables.ts         → INVENTORY_SCHEMA_NAME ("inventory")
modules/pharmacy/src/schema/tables.ts          → PHARMACY_SCHEMA_NAME ("pharmacy")
modules/integration-hub/.../schema/tables.ts   → INTEGRATION_HUB_SCHEMA_NAME ("integration_hub")
modules/opd/src/opd/core/schemas.py            → SCHEMA = "opd"
modules/master-data/app/core/catalog_schemas.py → GLOBAL_SCHEMA = "master_global"
                                                    TENANT_SCHEMA = "master_tenant"
```

Master Data is deliberately **two** physical schemas, not one — see §2. This is a *current-state correction* to the original issue, which only described a single `master_data` schema.

Rule of record: [`03-database-principles.md` §1](../architecture/analysis/03-database-principles.md#1-one-citus-cluster-separate-schemas-per-module) ("Each module owns a PostgreSQL schema") and [`03-module-shape-template.md` §8](../architecture/hld/03-module-shape-template.md) ("Each module owns its own database schema"). `CLAUDE.md`: *"No cross-schema foreign keys. Modules own separate schemas."*

## 2. Master Data is disjoint, not overlay-inherited

An earlier design (GitHub issue #25) considered a single wide catalog table with nullable `tenant_id`, where tenant rows would "inherit" from global rows. That was walked back. The ratified shape ([ADR-0020](../architecture/adr/0020-master-data-catalog-dual-schema.md)) is:

- `master_global.*` — shared reference rows, no tenant column at all.
- `master_tenant.*` — per-tenant rows, imported explicitly from global (never inherited implicitly).

```python
# modules/master-data/app/core/catalog_scope.py
"""Catalog: global in ``master_global`` (no ``iq_tenant_id``); per-tenant in ``master_tenant``."""
```

Why physical separation instead of one table with a nullable scope column: a forgotten `WHERE tenant_id = ...` on a single table silently leaks or unions global and tenant rows. Two schemas make the scope a property of *which table you queried*, not a filter you can forget.

## 3. Why not put everything in `public`?

PR #17's `public` tables (`public.permissions`, `public.modules`, `public.system_roles`) hit generic-name collision risk immediately — every module wants `roles`, `permissions`, `status`. Dedicated schemas namespace this for free (`user_management.roles` vs `master_global.permissions` coexist with no renaming games). The same separation buys:

- **Citus tooling clarity** — `SELECT * FROM citus_tables WHERE schemaname = 'empi'` vs. a flat 200+ table dump.
- **Backup/restore granularity** — `pg_dump -n empi` isolates one module.
- **`GRANT`/`REVOKE` at the schema level** — a per-module DB role can be scoped to its own schema only, if/when that hardening is turned on.

The issue's SQLite/`schema_translate_map` argument is now purely historical: the repo has since removed SQLite from the Python test suites entirely — anything touching a database runs against real Citus (commits `b785704a`, `7e3e13ea`; the only remaining "SQLite" strings in master-data are comments explaining what the old fallback used to misrepresent). A test-environment constraint no longer exists to argue against schema layout either way.

## 4. Why no cross-schema FKs or JOINs

A foreign key from `opd.prescriptions` into `empi.patients` would mean: OPD can't deploy or migrate independently of EMPI, a lock on `empi.patients` blocks OPD writes, and `ON DELETE` semantics force one module to react to another's write. This is documented in [`03-database-principles.md` §4](../architecture/analysis/03-database-principles.md#4-no-cross-schema-foreign-keys) and enforced at the code level per [`01-monorepo-setup.md`](../architecture/lld/repo-structure/01-monorepo-setup.md): *"A module must never import from another module... This enforces the no-cross-schema-foreign-keys principle at the code level."*

**Within** a module's own schema, FKs and JOINs are normal and encouraged (`opd.prescriptions → opd.visits`).

### This is actively enforced, not just documented

Two real, current examples:

**Fixed violation — configurator → master-data.** Configurator's `list-entitlement-enabled-module-ids.ts` used to JOIN directly into `master_global.modules`, violating configurator's own LLD. It was replaced with a narrow internal HTTP route + `PlatformModuleCatalogPort` / `HttpPlatformModuleCatalogClient` (`docs/architecture/cleanup/reachin-1-implementation-plan.md`, commit `223d7818`). Adversarial review then removed a planned TTL cache that reintroduced a sticky-deactivation hazard, and added a fail-closed floor so a broken/empty catalog fetch cannot mass-deactivate tenants' modules.

**Known, tracked exception — OPD → registration.** `modules/opd/src/opd/models/registration_patient_snapshot.py` currently does a direct cross-schema read of `registration.registration` for pharmacy-queue payloads (its own docstring: *"Cross-schema read (same PostgreSQL). Registration owns writes; OPD reads..."*). This is tracked as **reach-in #2** in `docs/architecture/cleanup/00-cleanup-master-map.md` (row I), explicitly gated on the async event bridge and deferred — not silently accepted as fine. It is the same category of problem the fixed configurator case was, kept open on purpose with an owner and a gate, per the project's [defer-with-a-gate rule](../architecture/cleanup/00-cleanup-master-map.md): "later" is only valid with a recoverable failure mode and an explicit gate.

## 5. The alternative: events, HTTP, or projections

Three sanctioned ways to get another module's data, in order of default preference:

1. **Events (async)** — the owning module publishes a domain event with a rich payload (all fields a consumer might need, not just IDs — see `CLAUDE.md`: "Rich event payloads"). Consumers project what they need locally. Governed by [ADR-0009](../architecture/adr/0009-event-driven-inter-module-communication.md) and, for Phase 0, [ADR-0017](../architecture/adr/0017-in-process-event-bus-phase-0.md) (`InProcessEventBus`).
2. **HTTP calls (sync)** — generated OpenAPI clients or a narrow internal S2S route, optionally behind a TTL cache with event-bust invalidation. This is now the **default** for cross-module reads (see the configurator fix above); projection tables are reserved for cases meeting specific criteria (near-zero read latency requirement, high read volume, tolerance for eventual consistency, and a real event stream to source from) — not used reflexively for every cross-module read.
3. **Local read projections** — a `*_projection` table in the *consuming* module's own schema, upserted by an event consumer, with no FK back to the source. Documented pattern: [`03-database-principles.md` §8](../architecture/analysis/03-database-principles.md#8-projection-tables-are-first-class-schema-citizens). Configurator's `config_schema_projection` / `feature_flag_projection` are sketched but not yet built (`modules/configurator/src/schema/tables.ts`, "Next: Projection tables").

What every option has in common: the consuming module never puts a `REFERENCES other_schema.table` constraint in its own DDL, and never JOINs across the schema boundary in a live query.

## Where the underlying rules live

| Doc | Covers |
|-----|--------|
| `CLAUDE.md` | One-line rule: no cross-schema FKs, modules own separate schemas |
| [`03-database-principles.md`](../architecture/analysis/03-database-principles.md) §1, §4, §8 | Schema-per-module, no-cross-schema-FK rationale, projection pattern |
| [`01-monorepo-setup.md`](../architecture/lld/repo-structure/01-monorepo-setup.md) | Code-level enforcement: no cross-module imports |
| [ADR-0009](../architecture/adr/0009-event-driven-inter-module-communication.md) | Why events for inter-module communication |
| [ADR-0017](../architecture/adr/0017-in-process-event-bus-phase-0.md) | Phase 0 event bus implementation |
| [ADR-0020](../architecture/adr/0020-master-data-catalog-dual-schema.md) | Why Master Data is `master_global` + `master_tenant`, disjoint with explicit import |
| `docs/architecture/cleanup/reachin-1-implementation-plan.md` | Real fix: configurator's cross-schema JOIN replaced with HTTP |
| `docs/architecture/cleanup/00-cleanup-master-map.md` (row I) | Tracked/gated exception: OPD's reach-in into `registration.*` |

## TL;DR

- One Citus cluster, one schema per module — never `public`. Master Data is the one module with **two** schemas (`master_global`, `master_tenant`), disjoint by design, not by inheritance.
- No FK, and no live JOIN, across a schema boundary. Within your own schema, both are normal.
- Default to HTTP calls (or events) for cross-module reads; reach for a local projection table only when the read-latency/volume case actually demands it.
- The rule isn't aspirational: a real violation (configurator → master-data) was found and fixed; the one remaining known violation (OPD → registration) is tracked with an explicit gate, not ignored.

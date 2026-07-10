# Cross-schema database access — census

**Produced:** 2026-07-09 · **Scope:** every `modules/*`, `services/*`, `packages/*` source tree (TS + Python), excluding tests and migrations. Every row below was verified by reading the source, not taken on trust from an audit prompt — see the corrections in §3.

## 1. The rule, and why

Two related but distinct rules govern the database layer (full detail: [`docs/guides/why-schema-per-module.md`](../../guides/why-schema-per-module.md)):

- **Schema-per-module.** Each module owns a dedicated PostgreSQL schema (`empi.*`, `configurator.*`, `registration.*`, `master_global.*`/`master_tenant.*`, …), never `public`. Rule of record: [`03-database-principles.md` §1](../analysis/03-database-principles.md#1-one-citus-cluster-separate-schemas-per-module), [`03-module-shape-template.md` §8](../hld/03-module-shape-template.md).
- **No cross-schema FKs or live JOINs.** A table in one module's schema must never `REFERENCES` another module's schema, and modules must not query across the boundary at runtime. `CLAUDE.md`: *"No cross-schema foreign keys. Modules own separate schemas."* / *"No cross-module imports... Cross-module communication: events (async) or generated OpenAPI clients (sync)."*

**Why:** the schema boundary is what makes the code-level rule (`modules/*` cannot import `modules/*`, enforced by `@nx/enforce-module-boundaries`) mean anything at the data layer. A cross-schema JOIN reintroduces, at the SQL level, exactly the coupling the import ban forbids at the TS/Python level — a lock on another module's table blocks your writes, `ON DELETE` semantics force one module to react to another's schema changes, and neither module can be migrated, backed up (`pg_dump -n <schema>`), or eventually split into its own database without finding and untangling every reach-in first. Schemas are the enforceable boundary that keeps modules *database-separable later*, even though they share one Citus cluster today ([`why-schema-per-module.md` §4](../../guides/why-schema-per-module.md#4-why-no-cross-schema-fks-or-joins)).

## 2. Method (re-runnable)

Two passes are needed because a violation can show up either as literal SQL text or as an ORM/query-builder table declaration that never spells out `FROM schema.table` in the code that queries it.

**Pass 1 — literal schema-qualified SQL**, across TS + Python source, tests/migrations/generated code excluded:

```bash
rg -n --iglob '*.ts' --iglob '*.py' \
  -e '\b(FROM|JOIN|INTO|UPDATE)\s+"?(user_management|configurator|empi|registration|record_foundation|billing|inventory|pharmacy|integration_hub|opd|master_global|master_tenant|auth)"?\.' \
  --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/tests/**' --glob '!**/test/**' \
  --glob '!**/migrations/**' --glob '!**/alembic/**' --glob '!**/__pycache__/**' \
  --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' \
  .
```

**Pass 2 — ORM/query-builder table declarations** (Drizzle `pgSchema(...)`, SQLAlchemy `__table_args__ = {"schema": ...}`) — these compile to schema-qualified SQL at runtime without ever writing `FROM schema.table` literally, so pass 1 misses them:

```bash
rg -n 'pgSchema\(' --glob '!**/node_modules/**' --glob '!**/*.test.ts' modules packages services
rg -n '__table_args__\s*=\s*\{"schema"' --glob '!**/__pycache__/**' modules
```

**Then cross-reference against the schema-ownership map** — a hit is a violation only when the file's owning module differs from the schema it names:

| Schema | Owning module |
|---|---|
| `user_management`, `auth` | `modules/user-management` (`auth` is better-auth's tables, provisioned by UM per ADR-0003 — see §4) |
| `configurator` | `modules/configurator` |
| `empi` | `modules/empi` |
| `registration` | `modules/registration` |
| `record_foundation` | `modules/record-foundation` |
| `billing` | `modules/billing` |
| `inventory` | `modules/inventory` |
| `pharmacy` | `modules/pharmacy` |
| `integration_hub` | `modules/integration-hub` |
| `opd` | `modules/opd` |
| `master_global`, `master_tenant` | `modules/master-data` |

Same-schema hits inside the owning module (e.g. `modules/inventory/src/data-access/stock.repo.ts` reading `inventory.stock`, `modules/configurator/.../list-entitlement-enabled-module-ids.ts` reading `configurator.tenant_modules`) are normal and excluded from the findings below.

## 3. Findings

| # | Location | Reads/writes | Status |
|---|---|---|---|
| 1 | `services/empi-svc/src/tenant-numeric-code.ts:19` | `configurator.tenants` (READ) | **Fixing — stage 1.** |
| 2 | `packages/ts-sdk-sequence/src/allocate-identifier.ts:33-34` (reads) + `packages/ts-sdk-sequence/src/counter.ts:12,14-22` (declares & writes) | `configurator.tenants` + `configurator.sequence_configuration` (READ, from empi-svc/registration-svc/billing); `empi.sequence_counters` (WRITE, via a locally-declared `pgSchema("empi")` table — Pass 2 hit) — called from `modules/billing/src/data-access/billing.repository.ts:19,72` and `services/registration-svc/src/main.ts:12,137` | **Fixing — stage 1.** |
| 3 | `modules/opd/src/opd/data_access/registration_patient_source.py:47,55-59` | `registration.visit` + `registration.registration` (READ) **and** `empi.patient_identifiers` + `empi.patients` (READ) | Reach-in #2 — deferred, gated on the event bridge (see §4). |
| 4 | `modules/opd/src/opd/models/registration_patient_snapshot.py:21` (Pass 2 hit — `__table_args__ = {"schema": REGISTRATION_SCHEMA}`) + `modules/opd/src/opd/data_access/registration_patient_snapshot.py:73,103` (ORM `select()`) | `registration.registration` (READ) | Reach-in #2 — same gate. |
| 5 | `modules/opd/src/opd/models/registration_visit.py:24` (Pass 2 hit) + `modules/opd/src/opd/data_access/registration_visit_display.py:18` (`session.get(...)`) | `registration.visit` (READ) | Reach-in #2 — same gate. |
| 6 | `modules/opd/src/opd/lib/clinical_report_context.py:125-126,154` | `configurator.tenants` + `configurator.tenant_integration_profiles` (READ) **and** `empi.patient_addresses` (READ) | **Not currently tracked** — see correction below. |
| 7 | `modules/user-management/src/data-access/user-activation-status-reader.ts:49-50` | `user_management.users` JOIN `auth."user"` | Documented exception (§4) — not a violation. |
| 8 | `modules/user-management/src/dev/sync-capabilities-from-master-data-catalog.ts:50-52` (READ `master_global.*`); `services/user-management-svc/src/dev/seed-dev-configurator.ts:31-75` and `tools/seed-user-management-dev/seed-configurator.ts:25-70` (WRITE `configurator.*`) | dev-bootstrap only | Documented exception (§4) — not a violation. |

**Correction to the audit brief that seeded this task:** it named `registration_patient_source.py` **and** `clinical_report_context.py` as both reading `registration.*`. Verified against source: `registration_patient_source.py` is correct (row 3). `clinical_report_context.py` does **not** touch `registration.*` at all — the one `registration.` string in that file is a comment (`# registration.visit.facility_id is an internal UUID...`). Its real cross-schema reads are into `configurator.*` and `empi.*` (row 6). This also means the master-map's "reach-in #2 = opd → registration" framing (`00-cleanup-master-map.md` row I) is narrower than the actual code: opd reaches into `empi.*` in the same code paths (rows 3, 6) and into `configurator.*` (row 6), neither of which currently has an owner or a gate. Recommend widening reach-in #2's scope (or opening a sibling item) to cover opd → `configurator`/`empi`, not just opd → `registration`, next time that item is picked up.

## 4. Exception classes

Two classes are treated as acceptable, not violations — each with a condition that would invalidate it:

1. **Same-service substrate (row 7).** `user_management.users JOIN auth."user"` is UM reading its own better-auth tables. ADR-0003 makes better-auth UM's identity adapter and UM provisions/owns the `auth` schema; the join stays inside one module's service boundary even though it spans two schemas. **Invalidated if:** `auth.*` is ever moved to a shared/separate service, or another module starts reading `auth.*` directly instead of going through UM's API.
2. **Dev-only bootstrap seeders (row 8).** `modules/user-management/src/dev/*` and the two `seed-dev-configurator.ts`/`seed-configurator.ts` scripts write/read across schemas to stand up a local dev tenant. Verified against the real code paths: `services/user-management-svc/package.json`'s `start` script is `tsx src/main.ts` with no seeder invocation, and `main.ts` never calls `platform-data-bootstrap.ts` in its boot path — the seeder is only reachable via the explicit `scripts/seed-platform-bootstrap.ts` dev entrypoint. Production tenant onboarding is a real API: `modules/configurator/src/rest-handlers/tenant-onboarding.handler.ts` → `use-cases/provision-tenant.ts`, writing to `configurator.*` from *inside* configurator's own module, not through a cross-schema reach-in. **Invalidated if:** any of these `src/dev/` files are imported from a non-dev/non-test entrypoint, or the seeded writes stop being idempotent/isolated to the dev tenant ID.

## 5. Cross-link

Linked from `docs/architecture/cleanup/00-cleanup-master-map.md` area I.

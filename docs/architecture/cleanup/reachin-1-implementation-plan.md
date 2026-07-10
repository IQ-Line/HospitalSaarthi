# #52 reach-in #1 — configurator → master-data, HTTP-first (D3/D8): implementation plan

> **Status: IMPLEMENTED + adversarially reviewed (2026-07-07).** Scope = reach-in #1 only;
> reach-in #2 (opd→registration projection) + async event-bridge stay deferred to Phase 5.
> Companion: `event-bridge-52-build-plan.md` (recon + scope decision).
>
> **Post-review revisions (supersede the design below where they differ):** (1) the adapter's TTL
> cache was REMOVED — it was a redundant third layer behind UM's per-tenant `CachedTenantEntitlementResolver`
> and it was the sole source of the sticky-deactivation hazard; the adapter now always fetches
> authoritatively (`listValidModuleIds()`, no `fresh` param, no double-fetch), and the proper
> event-bust cache is deferred to Phase 5 with the bridge. (2) A fail-closed FLOOR was added to the
> use-case: an authoritatively-empty catalog while the tenant has active modules THROWS instead of
> mass-deactivating (closes the real trap-#2 hole). (3) The S2S header is `x-master-data-internal-key`.

## The change in one line
Stop configurator from directly JOINing master-data's `master_global.modules`
(`modules/configurator/src/use-cases/list-entitlement-enabled-module-ids.ts:35,64`, forbidden by
configurator's own LLD `01-schema-design.md:378`). Replace the cross-schema query with a hand-written
HTTP adapter (D3) that calls a NEW narrow internal route on master-data, behind a TTL cache.

## Environment state on this machine (fresh, WSL2 + native pg)
- Branch `dev--improved-v1` @ `c3bcc744` (tracked tree clean). Base `dev` pinning is moot on this box.
- Done: `pnpm install` ✓; `uv` installed at `~/.local/bin` ✓; `uv sync --directory modules/master-data` ✓.
- **master-data tests = in-memory SQLite** (conftest `sqlite_session` attaches `master_global`/
  `master_tenant` as `:memory:`) → NO Docker/pg needed for pytest.
- **configurator integration test needs Citus** (`TEST_DATABASE_URL`, `hims-verify` container) →
  needs Docker (`make infra`). Native pg 5432 lacks the Citus extension. Enabling Docker Desktop WSL
  integration is the chosen path (also unlocks live e2e S2S round-trip + Cerbos for future work).
- Never stage the "not-ours" untracked WIP (see `HANDOFF-resume-state.md` list). Stage by explicit path.

## THREE correctness traps the rewrite MUST honor (from recon)
1. **Sticky mass-deactivation.** The use-case's queries filter `is_active = true`; once a row is set
   `is_active = false` it is never revisited → a transiently-stale/empty cached catalog that wrongly
   flags a valid module as orphan would deactivate it **permanently** (not self-healing). ⇒ the
   destructive orphan-UPDATE MUST run against an **authoritative (fresh, cache-bypassed) catalog**;
   only the non-destructive return-filter may use the TTL cache.
2. **Fail-closed on transient failure.** An empty/failed catalog fetch must NOT deactivate everything.
   The adapter THROWS on non-2xx / fetch error; the use-case propagates (handler → 5xx) so UM sees a
   failure and retries, rather than acting on corrupt/empty data.
3. **Soft-deleted == orphan.** Catalog membership = row present in `master_global.modules` WITH
   `is_deleted = false`. A soft-deleted (`is_deleted = true`) row is treated identically to a missing
   row → its tenant_modules entry is an orphan → deactivated.

## master-data (Python/FastAPI) changes
- **New setting** `internal_api_key` on `Settings` (`app/core/config.py`, `env_prefix=MASTER_DATA_`)
  → env `MASTER_DATA_INTERNAL_API_KEY`. No default (or empty ⇒ route refuses = fail-closed).
- **New internal-key dependency** (e.g. `app/api/internal_auth.py`): FastAPI dependency that reads
  header `x-master-data-internal-key`, compares (constant-time) to `settings.internal_api_key`; 401/403 if
  missing/mismatch; 503 if the key is unconfigured server-side (fail-closed).
- **New route** `GET /internal/modules` (new router file `app/api/v1/internal_modules.py`, or add to
  a small internal router; mount in `app/api/v1/router.py`). Returns `{ "data": [{ "id": <uuid>,
  "is_deleted": <bool> }] }` for the WHOLE global catalog. Depends on the internal-key dep.
  - Query the GLOBAL catalog explicitly (`CatalogScope(iq_tenant_id=None)` → `ModulePublicModel`),
    ignoring any tenant header. Do NOT reuse `get_catalog_scope` (a caller sending a tenant header
    would silently hit `master_tenant`).
  - **New repo method** `list_catalog_ids()` (ModuleRepository): `select(M.id, M.is_deleted)` with
    NO `is_deleted` filter and NO tenant filter — every existing list method hard-filters
    `is_deleted.is_(False)`, so none can emit deleted rows. Return lightweight rows/tuples; a tiny
    2-field DTO (NOT `ModuleResponse`, which needs ~18 fields incl. timestamps).
- **Gate wiring**: add the exact path `f"{settings.api_prefix}/internal/modules"` to
  `IdentityGateMiddleware(public_path_prefixes=...)` in `app/main.py` (currently only
  `{api_prefix}/health`). NARROW — exact path, not a blanket `/internal/` (ref: internal-route-
  identity-skip). The route then self-gates via the internal-key dep.
- **.env / .env.example**: add `MASTER_DATA_INTERNAL_API_KEY=<dev value>`.
- **Test** (`tests/test_api/test_internal_modules.py`, SQLite): seeds `ModulePublicModel` rows incl.
  one `is_deleted=true`; asserts (a) 200 + correct `{id,is_deleted}` set WITH the key, (b) 401/403
  WITHOUT/with-wrong key (the route is NOT JWT-gated — verify the identity gate is skipped AND the
  self-gate rejects), (c) deleted rows ARE present in the dump (so configurator can treat them as
  orphans), (d) tenant header is ignored (global catalog returned).

## configurator (TypeScript) changes
- **Port** `PlatformModuleCatalogPort` in `modules/configurator/src/ports.ts` (next to
  `InfrastructureModuleCatalogPort`, the closest analog). Method returns the set of VALID
  (non-deleted) catalog module ids, with a fresh-bypass option, e.g.:
  `listValidModuleIds(opts?: { fresh?: boolean }): Promise<Set<string>>`. Re-export the type from
  `modules/configurator/src/index.ts` (type-export block ~lines 86-98) or the service can't import it.
- **Adapter** `HttpPlatformModuleCatalogClient` in `services/configurator-svc/src/adapters/`
  (adapters live in the SERVICE layer; module stays infra-free). Mirror
  `http-module-capability-resolver-adapter.ts`: native `fetch`, `AbortSignal.timeout`, THROW on
  non-ok, parse `{ data: [...] }`. Build as a **SINGLETON** (like the cache-invalidator), NOT a
  per-request factory — it uses a static internal key (S2S), and a TTL cache only pays off on a
  long-lived instance. Constructor opts: `{ baseUrl, internalApiKey, ttlMs?, timeoutMs?, log? }`.
  - Header `x-master-data-internal-key`; base URL `MASTER_DATA_URL` (already resolved in main.ts, default
    `http://localhost:8010`); new env `MASTER_DATA_INTERNAL_API_KEY`.
  - Cache: keep it SIMPLE — an inline `{ ids: Set<string>; expiresAt: number }` field, not the whole
    `BoundedTtlCache` class (can't import UM's; a full class is over-engineering for one list). On
    `listValidModuleIds()`: serve cache if unexpired; else fetch, filter `is_deleted===false`, store.
    `fresh: true` bypasses + refreshes the cache. On fetch/parse failure: THROW (don't cache).
- **Rewrite** `list-entitlement-enabled-module-ids.ts` — new signature takes the port, e.g.
  `listEntitlementEnabledModuleIds(db, catalog, iqTenantId)`:
  1. Read the tenant's ACTIVE `tenant_modules` rows (module_id, is_active) — configurator's own schema.
  2. `const valid = await catalog.listValidModuleIds()` (cached).
  3. Candidate orphans = active module_ids NOT in `valid`.
  4. If candidates exist: `const fresh = await catalog.listValidModuleIds({ fresh: true })`; recompute
     orphans against `fresh`; deactivate ONLY confirmed orphans via the EXISTING UPDATE by
     `(iq_tenant_id, module_id)` (unchanged — Citus-safe). Use `fresh` for the return filter too.
  5. Return active rows whose module_id ∈ (fresh-if-refreshed-else-cached) valid set.
  - Preserves: orphan-deactivate side-effect, fail-closed-prevention intent, Citus SELECT-then-UPDATE
    split. Removes: both raw `master_global` cross-schema queries.
- **DI wiring** (4 hops): construct the singleton adapter in `services/configurator-svc/src/main.ts`
  (near the invalidator, ~147-154; read `MASTER_DATA_INTERNAL_API_KEY` via a `requireUpstream`-style
  helper) → add to `ConfiguratorRouterOptions` in `modules/configurator/src/router.ts` as a singleton
  option → pass into `registerInternalTenantEntitlementHandler(app, { db, platformModuleCatalog })`
  (`router.ts:91`) → add to `InternalTenantEntitlementHandlerDeps` in
  `rest-handlers/internal-tenant-entitlement.handler.ts` and pass to the use-case.
- **Tests**:
  - Adapter unit test (mock `fetch`): cache hit/miss/expiry, `fresh` bypass, filters `is_deleted`,
    THROWS on non-2xx / network error, sends `x-master-data-internal-key`.
  - Update `test/integration/use-cases/configurator-persistence.integration.test.ts`: DELETE the
    hand-fabricated `master_global.modules` table + its TRUNCATE_TARGETS entry (dead after JOIN
    removal); inject a STUB `PlatformModuleCatalogPort` returning a controlled valid-id set; assert
    orphan/deleted → `is_active=false` + `is_core_override=false`, valid untouched, return shape.
    Add a NEW case: catalog throws → use-case propagates AND deactivates nothing (trap #2).
  - Update `test/unit/http/configurator-internal-route-auth.test.ts`: if handler deps gain
    `platformModuleCatalog`, update `buildConfiguratorAuthTestApp()` so it still compiles (it builds
    the handler with `db: {} as never`).

## Verification plan (evidence, per doctrine)
1. `uv run --directory modules/master-data pytest -q` → master-data green incl. new internal-route test (SQLite).
2. `uv run --directory modules/master-data ruff check .` → clean.
3. `npx nx run configurator:test` → configurator unit + integration green (integration needs
   `make infra` up + `TEST_DATABASE_URL` exported to the Citus verify DB).
4. `npx nx run configurator:lint` → clean. (Respect project CLAUDE.md: no `tsc` — use vitest/eslint.)
5. **Live e2e** (once Docker up): start master-data + configurator; curl
   `GET /api/v1/master-data/internal/modules` with/without `x-master-data-internal-key` (200 vs 401); then
   drive `GET /internal/tenants/:id/enabled-module-ids` and confirm orphan deactivation persisted.
6. Adversarial review pass (spawn skeptics on traps #1-#3 + the fail-open/closed semantics) before commit.

## Resume checklist (cold start)
- [ ] `git checkout dev--improved-v1` (fetch origin if missing; @ c3bcc744 or later).
- [ ] Ensure Docker up: `make infra` (Citus 5433/5444, Cerbos 3592, PgBouncer). Native pg still on 5432.
- [ ] Re-read the TS files not yet read verbatim: `http-module-capability-resolver-adapter.ts`,
      `http-user-management-entitlement-cache-invalidator.ts`, UM `bounded-ttl-cache.ts` +
      `http-master-data-module-catalog-adapter.ts`, configurator `ports.ts`, `index.ts`, `router.ts`,
      `services/configurator-svc/src/main.ts`, `rest-handlers/internal-tenant-entitlement.handler.ts`,
      `http/configurator-identity-skip-paths.ts`, and the two configurator tests.
- [ ] Implement master-data side → pytest green. Then configurator side → nx test green. Then e2e.
- [ ] Adversarial review → commit (trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`).

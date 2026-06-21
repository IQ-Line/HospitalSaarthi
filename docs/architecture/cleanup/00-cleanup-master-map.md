# HIMS Cleanup & Refinement — Master Map (v1)

> **Branch:** `dev--improved-v1` (off `dev`) · **Produced:** 2026-06-21 · **Status:** analysis complete, execution not started
> **How produced:** 13-area parallel deep-dive audit + completeness critic + sequencing synthesis (15 agents), each comparing *current code* vs *intended design (ADRs/HLDs/LLDs + GitHub issues)* vs *ecosystem-canonical approach*. Key claims spot-verified inline.
> **This is the durable index for the cleanup initiative. Update §11 (Session log) and the Decision register as work proceeds.**

---

## 0. How to use this doc

This is the single source of truth for the "clean up & set things up properly" initiative running on the side of mainline dev work. It is **not** a re-architecture — intended architecture is preserved; we are closing the gap between intent and implementation, removing hacks, and standardizing.

- §4 **Concern-area register** — the 20 areas, health, core problem, top gaps.
- §5 **Decision register** — every decision only the user can make. *Resolve these before/when executing the relevant area.* This is the most reusable section across sessions.
- §6 **Roadmap** — dependency-ordered phases (what blocks what).
- §7 **Conflicts & overlaps** — where areas collide; decide once, not N times.
- §11 **Session log** — append what we did each session.

---

## 1. Ground rules (invariants for this initiative)

1. **Pre-production ⇒ DB state is disposable.** Migrations, seed data, and DB can be rebuilt from scratch. Prefer correct end-state over incremental band-aids. *(Assumption A1 — confirm no long-lived shared dev DB needs in-place migration.)*
2. **Do not alter intended architecture.** Modules ≠ services (a module need not be its own service); modular-monorepo boundaries hold; polyglot is fine.
3. **Verify ecosystem-canonical approach before judging a mechanism** (Context7/docs). Don't "make the existing approach work" if it's the wrong approach; check if a sibling (esp. the Python side) already does it the standard way.
4. **Read the standing principles**: `CLAUDE.md`, `docs/architecture/lld/repo-structure/01-monorepo-setup.md`, `docs/architecture/analysis/03-database-principles.md`, the ADRs.
5. **No `tsc`/`tsc -b` locally** (WSL2 freeze) — typecheck belongs in CI.

---

## 2. Verified facts (confirmed this session)

| Fact | Evidence |
|---|---|
| CI runs on `main` **only**, never on the `dev` trunk; integration + typecheck stages commented out. No GitLab/Azure pipeline exists. | `.github/workflows/ci.yml:4-7`; `gitlab-registry-secret` is only a k8s imagePullSecret |
| PR #65 (per-module hand-written SQL migration pattern) is **MERGED into dev**; issue #66 (reverse → drizzle-kit) is **OPEN**. | `gh pr view 65` (merged 2026-05-19), `gh issue view 66` |
| **62** local branches already merged into `dev`. Active worktrees exist **inside** `.claude/worktrees/` (7) **and outside the repo** (`../HIMS-pr46-merge2`, `../The-HIMS-pr140`, `/tmp/pr267-review` prunable). | `git branch --merged dev`, `git worktree list` |
| Zero `__tests__/` dirs; 282 sibling TS test files. | `find … -name '*.test.ts'` |
| Only empi/record-foundation/integration-hub have `drizzle.config.ts` + `drizzle-kit`; all TS modules run `apply-migration.ts` with hardcoded file arrays, no tracking table. | `modules/*/src/schema/apply-migration.ts` |
| smart-report-v2 has **zero references** in-repo and 404s for the current `gh` token. | grep + `gh repo view IQ-Line/smart-report-v2` |

---

## 3. Open assumptions still to verify (load-bearing)

- **A1 — DB truly disposable.** Multiple destructive recommendations (fresh drizzle baselines, schema rebuild, branch deletion) depend on it. Confirm no shared long-lived dev DB.
- **A2 — smart-report-v2 nature.** Language? service vs library? published where? Premise ("monorepo meant to consume it") is unverifiable from this environment — needs user/org answer + repo access.
- **A3 — per-pod isolated event bus** is literally true in every env (drives the "dead cross-process subscription" conclusions). Inferred from topology, not runtime-observed.
- **A4 — Citus** is never actually applied in dev (env-gated probe unset) → cluster is plain single-node PG; "Citus-ready" shape unproven until enabled.

---

## 4. Concern-area register (20 areas)

Health: **good** / **fair** / **poor** / **broken**. 13 audited + 7 found by the completeness critic.

| # | Area | Health | Core problem (one line) |
|---|------|--------|--------------------------|
| A | migrations | poor | Hand-written SQL re-run on every boot, no tracking table/journal; drizzle-kit set up in name only; should be drizzle-kit for all TS modules (issue #66), matching master-data's Alembic. |
| B | tests | poor | No single convention (3 conflicting docs + user pref); unit/integration split unimplemented (`.integration.test.ts` polluted by non-DB tests); PR #35 stale; CI doesn't gate dev. |
| C | nx | fair | Never adopted Nx 22 plugin inference → all targets hand-authored & drifted; services lack lint; only 6/36 typecheck; one broken `@nx/vite:test` target. |
| D | external-repo (smart-report-v2) | poor | Not integrated at all; a *different* external reporting repo (pdf-platform) is already hand-reimplemented twice (TS+Python) with no shared spec; templates line-scraped from a legacy repo. |
| E | authz | poor | Cerbos policies hand-copy a per-action 3-rule template (no derivedRoles/exportVariables); unconditional super-admin bypass contradicts #93; centralization PR stack abandoned; **two authz directions live on dev**. |
| F | authn | poor | Login is **email-primary** — the inverse of ADR-0003's username-primary mandate; better-auth `username()` plugin never installed; BFF Token Handler doesn't exist (bff is a dumb proxy). |
| G | event-bridge | poor | TS SDK now widely adopted, but the **cross-process/cross-language bridge** (the point of #30) was never built; per-pod isolated buses ⇒ dead subscriptions; organic catalog diverged from the designed one. |
| H | module-boundaries | fair | `@nx/enforce-module-boundaries` configured but **toothless** (depConstraints tags don't match real tags); master-data is a module tagged `type:service` w/ embedded FastAPI; dead abdm-adapter scaffolding. |
| I | database | fair | OPD uses `tenant_id` not `iq_tenant_id`; Citus distribution never applied/verified; catalog tables not declared as reference tables; OPD reads `registration.*` cross-schema; stale per-module-DB infra contradicts ADR-0013. |
| J | hygiene | fair | 62 merged branches + worktrees (780M); 32 committed source-maps; stray workspace files; `.gitignore` gaps (.opencode 103M, scratch, tmp); ADR-0031 numbering collision. |
| K | spec-first | poor | Spec-first is aspirational: only 1/11 modules has any spec↔runtime check; no generated clients exist; Python is code-first w/ unautomated YAML exports; demonstrable route drift. |
| L | frontend | good | Healthiest area; problems are drift not design: LLD documents an abandoned permission model; `@cerbos/react` wired but 0 uses; #100 dup tenant-header; untracked mock layers (#112 anti-pattern). |
| M | issues-triage | poor | Tracker drifted from code: realized issues still open (#11/#33/#34/#129/#143); abandoned authz stack never closed; body-less conflicting feature PR wave. |
| N | **ci-cd-delivery** *(critic)* | poor | **No delivery half of CI/CD**: k8s deploys 13 services on mutable `:dev-latest`, but nothing builds/pushes images. Green CI proves nothing about what ships. |
| O | **dependency-drift** *(critic)* | poor | TS declared `^5`/`~5.9`/`>=5.6`/`^6` across packages but resolves to TS 6.0.3; Fastify declared 5 ways; no `engines.node` anywhere; no pnpm `catalog:`/single-version policy. |
| P | **observability** *(critic)* | poor | No tracing/metrics/structured-logging convention; raw `console.*` in source; no correlation IDs; no `/metrics`; the synchronous cross-service HTTP that runs everything is untraced. |
| Q | **dev-seeding/bootstrap** *(critic)* | fair | 5+ overlapping seed/bootstrap subsystems, no single owner; web reaches 4 levels into `packages/dev-bootstrap/src`. |
| R | **error-handling** *(critic)* | fair | No shared error package / RFC7807; per-module ad-hoc errors; most services never call `setErrorHandler` ⇒ inconsistent error envelopes (contract gap for a spec-first platform). |
| S | **docker-infra** *(critic)* | fair | Inconsistent image build (one-off Dockerfiles); cerbos pinned to `:latest` (non-reproducible policy-compile gate); pgbouncer on a `bitnamilegacy` image. |
| T | **i18n/a11y** *(critic)* | poor (low pri) | No i18n foundation in an India/AIIMS-scope SPA; retrofitting later is costly. Possibly out of Phase-1 scope. |

### Per-area detail (top gaps with severity/effort)

**A — migrations:** `[crit/L]` no tracking table → every `.sql` re-runs on boot · `[crit/M]` ghost migration files silently never applied (UM `0003_*`, registration `0004_*`, configurator `009_*`) · `[high/M]` duplicate/ambiguous ordering (two `0001_*` in UM; two `005_*`/`009_*` in configurator) · `[high/M]` `tables.ts` source-of-truth vs applied SQL can drift, no gate · `[high/XL]` PR #65 generalized the wrong pattern. Tracked: **#66**, PR #65 (merged), per-module `db:migrate`+`db-migrate` dup targets. master-data Alembic is the in-house precedent.

**B — tests:** `[crit/S]` CI triggers on `main` only → dev PRs never tested · `[high/M]` unit/integration split unimplemented; `.integration.test.ts` polluted by 6 non-DB tests · `[high/L]` PR #35 uses per-module duplicated configs vs vitest canonical `projects` field · `[high/L]` Python master-data+opd still on in-memory SQLite (incl. files named `*_crud_integration.py`) · `[med/S]` `ci:pr` runs forbidden `tsc`. Tracked: **#36, PR #35, #137**.

**C — nx:** `[crit/S]` CI never runs on trunk · `[high/L]` no plugin inference (root cause of drift) · `[high/S]` `@nx/vite:test` used but plugin not installed · `[high/M]` 10 services lack lint; 6/36 typecheck · `[med/S]` dup migrate targets in 11 projects · `[low/S]` no `.nxignore`. Note: issue #113 item 5 (billing-svc:serve "malformed") is **wrong** — it's valid command-sugar. Tracked: **#113**.

**D — external-repo:** `[high/S]` smart-report-v2 absent + unverifiable (A2) · `[high/M]` pdf-platform HTTP contract hand-reimplemented twice (TS `packages/pdf-client` + Python `modules/opd/.../pdf_platform_client.py`) · `[high/L]` report templates from a non-reproducible line-scrape (`tools/extract-opd-report-templates.mjs`) · `[med/S]` no ADR records the external-reporting decision.

**E — authz:** `[crit/M]` unconditional super-admin bypass (contradicts #93) · `[high/L]` policies don't use derivedRoles/exportVariables · `[high/M]` policies reference capability keys the master-data catalog never generates · `[high/L]` empi/configurator/master-data/opd have no real PEP on dev. Tracked: abandoned stack **#135→#136→#139→#141→#149**; **#89/#93/#94**, #125/#128, #60, ADR-0004/0032. dev still runs the OLD `resolveTarget` pattern (`packages/ts-sdk-authz/src/plugin.ts:90,186`).

**F — authn:** `[crit/M]` login email-primary; `username()` plugin never installed (violates ADR-0003) · `[high/M]` no synthetic/sub-addressed email anchor; `createUser` requires a real RFC email · `[high/L]` BFF Token Handler missing (bff is `@fastify/http-proxy` only) · `[med/S]` dev-auth doc documents the wrong (email) reality. Tracked: **#114, #90**; `user-management-authn-solution-deliberation.txt` (795-line design record). ADR-0003/0015.

**G — event-bridge:** `[high/L]` cross-process bridge (core of #30) doesn't exist; no `/internal/events` receiver · `[high/L]` py-sdk-events (PR #31) unmerged; master-data/opd publish nothing · `[high/M]` none of #30's 10 catalog events exist; organic catalog diverged & undocumented · `[med/S]` dead subscription UM←`configurator.tenant_module.*` (cross-process, unreachable). Tracked: **#30, PR #31**, ADR-0009/0017.

**H — module-boundaries:** `[crit/M]` enforce-module-boundaries depConstraints reference tags no project carries → unenforced · `[high/M]` inconsistent/missing Nx tags · `[high/L]` master-data tagged `type:service` w/ embedded FastAPI, no `services/master-data-svc` · `[med/S]` abdm-adapter + abdm-adapter-svc empty dead scaffolding · `[med/L]` cross-module sync via hand-rolled HTTP clients vs prescribed generated openapi-clients. ADR-0006/0008.

**I — database:** `[high/M]` OPD `tenant_id` vs `iq_tenant_id` · `[high/L]` Citus never applied/verified (A4) · `[high/L]` catalog tables FK'd by distributed tables not declared reference tables · `[high/L]` OPD cross-schema reads into `registration.*` · `[med/S]` stale `infra/db/create-module-databases.sql` contradicts ADR-0013. Tracked: **#91, #92**, #25/#26, ADR-0012/0013/0020/0021.

**J — hygiene:** `[high/M]` 7 worktrees in `.claude/worktrees/` (780M) pinning merged branches · `[med/S]` 61 merged branches · `[med/S]` 32 committed source-maps under `packages/ts-sdk-fhir/src/` · `[med/S]` `.gitignore`/`.dockerignore` miss `.opencode/`(103M)/`scratch`/`tmp`/`.worktrees` · `[med/S]` ADR-0031 collision (two files share the number) · `[low/S]` root deliberation `.txt` + `.npmrc` need a home.

**K — spec-first:** `[high/L]` no generated cross-module client mechanism (`packages/openapi-clients` doesn't exist) · `[high/M]` spec↔runtime check on 1/11 modules · `[high/M]` undocumented runtime routes in empi/registration · `[high/L]` Python code-first but YAML is an unautomated export. ADR-0016.

**L — frontend:** `[high/M]` LLD documents abandoned nested PermissionMap (code uses flat capability keys) · `[high/M]` #100 dup tenant-header still live · `[med/M]` `@cerbos/react` wired, 0 hook uses · `[med/M]` untracked create-rx/opd-patients mock layers (#112 anti-pattern) · `[med/L]` 3 parallel route-gating subsystems. Tracked: **#100, #112, #114, #90, #20**. ADR-0018.

**M — issues-triage:** `[crit/L]` authz stack abandoned, never closed; dev runs the pattern it was to delete · `[high/S]` realized issues still open · `[high/M]` testing #35 + py-sdk-events #31 are the canonical foundations others depend on, both stale · `[high/L]` body-less conflicting feature-PR wave (#211/#250/#253/#291/#292). 30 open issues, 15 open PRs.

**N–T — critic-found:** see §4 table. **N (ci-cd-delivery)** and the CI-on-dev gap should be unified into one CI/CD workstream. **O (dependency-drift)** → pnpm `catalog:` single-version policy + `engines.node`. **P (observability)** → shared logging/trace SDK + correlation IDs. **Q (dev-seeding)** → consolidate to one owner. **R (error-handling)** → shared `ts-sdk-errors` + RFC7807. **S (docker-infra)** → shared base image + pin cerbos. **T (i18n)** → likely deferred; flag now.

---

## 5. Decision register (resolve these — only the user can)

> Status: ☐ open · ☑ decided. Record the decision + date inline when resolved.

**Foundational / cross-cutting (gate multiple areas):**
- ☑ **D1 (test layout) — DECIDED 2026-06-21: separated `test/unit` + `test/integration`** (the LLD's documented layout, `01-monorepo-setup.md:168`; also mirrors the Python `tests/` dirs). Implies: move all 282 sibling TS test files into per-project `test/{unit,integration}`; rewrite vitest `include`/`exclude` globs AND `nx.json` `production` namedInput from suffix-based (`*.test.ts`) to **path-based** (`test/**`) in lockstep; correct issue #36 (says siblings) and the earlier `__tests__/` preference. Unit/integration split stays driven by directory + `DATABASE_URL`. Gates: B, C.
- ☑ **D2 (migration direction) — DECIDED 2026-06-21: reverse PR #65, adopt drizzle-kit (#66)** for all TS modules via shared `packages/ts-sdk-db`; regenerate **fresh** baselines from `src/schema/tables.ts` (A1 accepted — DB disposable, no `_journal.json` history stitching). Gates: A, I.
- ☐ **D3 (cross-module sync mechanism)** — Build generated `packages/openapi-clients` (openapi-fetch/openapi-generator per ADR-0016) vs amend ADR to bless ports + hand-written adapters. *One decision for H, K, G, D.*
- ☑ **D4 (distribution-key name) — DECIDED 2026-06-21: `iq_tenant_id` is canonical.** OPD (`tenant_id`) gets renamed; `database-principles.md §2` (which says `tenant_id`) gets corrected to match. Gates: I, B (fixtures).
- ☐ **D5 (master-data classification)** — Normalize to module + `services/master-data-svc` (rec; matches opd/empi) vs document embedded-service as an intentional exception. Gates: C, H, I, B.
- ☐ **D6 (Nx inference)** — Adopt Nx 22 plugin inference (`@nx/js`/`@nx/eslint`/`@nx/vite`) as standard, deleting most per-project targets? *Rec yes; large repo-wide change.* Gates: C, H.
- ☑ **D7 (CI trunk) — DECIDED 2026-06-21: yes, retarget CI to gate `dev`** (implied by selecting Phase 0). CI image build/push/deploy (area N) folded into Phase 0/2. Gates: everything observable.
- ☐ **D8 (events vs HTTP as default)** — Finish #30 HTTP `/internal/events` bridge (events-as-default) vs formally bless synchronous HTTP for Phase 1 and demote events to intra-process. Reconcile docs either way. Gates: G.
- ☑ **D9 (Citus in dev) — DECIDED 2026-06-21: distribute unconditionally** (dev + CI already run `citusdata/citus:12.1`). Distribution/reference-table creation moves into journaled `--custom` migrations that always run; the old unset-env-gated `create_distributed_table` probes are removed. **Verified on empi** against real Citus. Gates: I (closes risk A4).

**Per-area decisions:**
- ☐ **D10 (super-admin model)** — Granular cross-tenant capability bundle (rec, #93) vs Cerbos derivedRole shorthand. Affects E, F, L.
- ☐ **D11 (username uniqueness)** — Global tenant-prefixed handle vs custom `databaseHook` enforcing `(username, iq_tenant_id)`. (Decide before wiring plugin to avoid a second migration.)
- ☐ **D12 (email anchor policy)** — Deliverable sub-addressed (`admin+N@base`, keeps email recovery) vs non-deliverable `{username}@auth.internal` (admin-mediated recovery). Drives recovery flows.
- ☐ **D13 (BFF Token Handler)** — In Phase-1 scope (session-cookie→1-2m JWT + HttpOnly refresh) vs accept UM-issued 5m JWTs + proxy-only BFF (leaves #90/#114 open).
- ☐ **D14 (Python spec strategy)** — Bless code-first (FastAPI `app.openapi()` export + CI diff; rec) vs force YAML-first onto FastAPI. Amend ADR-0016 for polyglot reality.
- ☐ **D15 (smart-report-v2)** — What is it (A2)? Does it supersede pdf-platform, the scraped templates, or is it a third thing? Who grants repo access? Integration mechanism (submodule / nx import / published package / pnpm catalog)?
- ☐ **D16 (frontend authz docs)** — Update LLD to capability-key model vs designate `capability-key-first.md` as single source. And adopt-or-remove `@cerbos/react`.
- ☐ **D17 (schema rename + reference tables)** — Fold #91 (global_master→master_global, tenant_master→master_tenant) + #92 (Citus reference tables) into the Phase-1 rebuild (rec, cheap pre-prod) vs defer.
- ☐ **D18 (hygiene specifics)** — `.npmrc` commit vs ignore (rec commit); root `user-management-authn-solution-deliberation.txt` → promote to `docs/` vs delete; confirm worktrees safe to remove; ADR-0031 → keep um-role-template as 0031, move abdm-m3 to 0033.
- ☐ **D19 (dependency policy)** — Adopt pnpm `catalog:` single-version + `engines.node` across all 42 package.json. Reconcile CLAUDE.md ("ESLint 10"/TS) with installed versions.
- ☐ **D20 (i18n)** — In scope now or explicitly deferred (record the gate)?
- ☐ **D21 (branch/integration strategy)** — IPD stack (#211 umbrella + #250/#253 targeting `module/ipd-lite`); #169 offline-approach lives in another repo — track here or close?

---

## 6. Sequenced roadmap (dependency-ordered)

> Recommended order from the sequencing synthesis. "blockedBy" = must come after.

- **Phase 0 — Unblock & decontaminate** · areas: **J (hygiene), C (nx quick-fixes only)**. Highest leverage: **retarget CI to `dev` (D7)** flips the repo from "no dev PR tested" to verifiable; remove broken `@nx/vite:test` target, dup migrate targets, dead Makefile targets; delete 61 merged branches + worktrees (confirm first); drop committed source-maps/workspace files; close `.gitignore` gaps; resolve ADR-0031; delete stale `create-module-databases.sql` + empty abdm-adapter scaffolding. *(Nx plugin-inference rebuild deferred to Phase 2.)*
- **Phase 1 — DB & migration foundation rebuild** · areas: **A, I** · blockedBy: J, C. One atomic destructive pre-prod operation: reverse #65 → drizzle-kit (D2) shared via `packages/ts-sdk-db`; rename OPD `tenant_id`→`iq_tenant_id` (D4); reference tables (#92) + distribute `tenant_master.*`; schema rename (#91, D17); enable-or-document Citus (D9); delete stale per-module-DB infra; fix OPD cross-schema reads.
- **Phase 2 — Boundaries, spec-first, Nx inference** · areas: **H, K, C** · blockedBy: A, I. Make enforce-module-boundaries bite (tags); adopt Nx inference (D6); normalize master-data (D5); decide cross-module client mechanism (D3); Python code-first (D14); add lint/typecheck everywhere + a module generator.
- **Phase 3 — Identity (authn) & test infra** · areas: **F, B** · blockedBy: A, I, C, H, K, J. Username-primary rebuild (D10–D13); resolve test layout (D1) + vitest `projects` + uncomment integration CI + Python off SQLite.
- **Phase 4 — Authorization rebuild** · area: **E** · blockedBy: F, A, I, K, H. Close abandoned stack; pick canonical direction; Cerbos derivedRoles/exportVariables + base tenant-isolation policy; remove super-admin bypass (D10); capability keys authoritative from master-data seed; real PEPs everywhere.
- **Phase 5 — Event bridge & external reporting** · areas: **G, D** · blockedBy: H, K, F. Decide D8; merge py-sdk-events; reconcile catalog; smart-report-v2 (D15) once A2 answered.
- **Phase 6 — Frontend reconciliation & triage closeout** · areas: **L, M** · blockedBy: E, F, K. Doc reconciliation (D16); #100/#112/#114/#90; close realized issues + abandoned stack; gates on deferred items.
- **Continuous / fold-in:** **N (ci-cd-delivery)** into Phase 0/2 CI work; **O (deps)** Phase 0/2; **P (observability)**, **R (error-handling)**, **S (docker-infra)**, **Q (seeding)** as their own slices when the dependent foundation is ready; **T (i18n)** per D20.

---

## 7. Cross-area conflicts & overlaps (decide once)

- **CI scope** triple-claimed (C, B, M) + the uncovered delivery half (N) → **one** CI/CD workstream.
- **drizzle-kit (#66)** owned by A, M, C → single owner (A).
- **Generated cross-module clients** claimed by K, H, and touched by G, D → **D3 decides for all four**.
- **Citus reference tables / schema rename (#91/#92)** in I and M → one migration rebuild (Phase 1).
- **Nx tags / enforce-module-boundaries** in H and C → single repo-wide edit (Phase 2).
- **master-data module-vs-service** in C, H, I → **D5 resolves all**.
- **Authz stack abandonment + super-admin** in E and M → one authz-direction decision (D10/Phase 4).
- **Auth-flow (#90/#114, BFF)** spans F (backend) and L (frontend) → don't split.
- **Capability-key namespace** spans E (policies), L (gates), and master-data seed → one naming decision.
- **Stale per-module-DB infra** in I, J, and k8s secrets → coordinate deletion with the shared-DB story.

---

## 8. Quick wins (low effort, high value — mostly Phase 0)

CI→dev (D7) · remove broken `@nx/vite:test` + dup migrate targets + dead Makefile targets · move `tsc` to CI-only · delete 61 merged branches + worktrees (confirm) · drop 32 source-maps + stray workspace files + close `.gitignore` gaps · delete `create-module-databases.sql` + empty abdm-adapter scaffolding · fix ADR-0031 collision · close realized issues (#11/#33/#34/#129/#143) + abandoned authz stack · drop wrong issue #113 item 5.

---

## 9. Biggest risks

1. **Two live authz directions** (old `resolveTarget` on dev vs abandoned stack vs out-of-band #289) + unconditional super-admin bypass = live cross-tenant hole until one is canonical.
2. **Citus never exercised** (A4) → distribution/reference-table failures surface in prod, not CI.
3. **Migration rebuild must be one atomic op** with the DB reshape, or the destructive-rebuild tax is paid twice; every new `.sql` doubles conversion cost.
4. **Spec drift unenforced** → shipping the body-less feature-PR wave before Phase 2 locks in N more drifting modules.
5. **smart-report-v2 unverifiable** (A2) → risk of two parallel external-reporting integrations.
6. **Events silently single-process** while docs claim cross-service async → correctness landmine for new consumers.
7. **authn is the inverse of its ADR** → building authz/frontend on the wrong identity model means redoing both.

---

## 10. Tracked-work disposition (summary)

- **Close as realized-on-dev:** #11, #33, #34, #129, #143 (confirm remaining phases first).
- **Close as abandoned:** authz stack #135/#136/#139/#141/#149 (re-scope a fresh authz cleanup).
- **Revive as foundation:** PR #35 (tests — but switch to vitest `projects`), PR #31 (py-sdk-events).
- **Fold into cleanup phases:** #66→A, #113→C, #91/#92→I, #89/#93/#94→E, #100/#112/#114/#90→L/F, #36/#25/#26→KB docs.
- **Decide branch strategy:** #211/#250/#253 (IPD), #169 (offline, lives in another repo).

---

## 11. Session log

| Date | Session | What happened |
|---|---|---|
| 2026-06-21 | 1 | Deep-dive analysis (15-agent workflow). Created branch `dev--improved-v1`. Wrote this map. Verified CI-on-main, PR#65 merged/#66 open, 62 merged branches. |
| 2026-06-21 | 1 | **First work block chosen:** Phase 0 + Phase 1 + AuthZ + AuthN. **Decisions:** D1=separated `test/unit`+`test/integration`; D2=drizzle-kit + fresh baselines; D7=CI→dev. Internal execution order: Phase 0 → Phase 1 → AuthN → AuthZ (authz depends on authn + capability-key correctness; both pull in the minimal Phase-2 boundary/spec bits they need). |
| 2026-06-21 | 1 | **Phase 0 committed: `286eefe6`** (scoped — no unrelated WIP swept in; `.npmrc` now tracked). **Branch/worktree cleanup:** removed 5 of 7 `.claude/worktrees` (2 kept — uncommitted work: `feat/abdm-adapter-scaffold`, `billing_reg_integration`); pruned stale `/tmp/pr267-review`; **deleted 58 merged branches** (77→19 local). Preserved all branches needed downstream (authz-level-1/2/3a/3b, fix/authz-corrections, py-sdk-events, chore/testing-scaffolding, record-foundation-module, module/ipd-lite). **abdm-adapter dead-dir deletion NOT done** — it's a live prototype (ADR-0030) mid-transition to integration-hub (see DEVNOTE 2026-05-28); reclassified from "quick win" to **deferred**. **Phase 0 complete. Next: Phase 1 (DB + migrations drizzle-kit rebuild) — recommend a fresh focused session.** |
| 2026-06-21 | 1 | **Phase 0 executed (safe items):** CI now triggers on `[dev, main]`; `.gitignore` gaps closed (`.opencode/`,`scratch/`,`tmp/`,`.worktrees/`,`*.code-workspace`); untracked the 32 `ts-sdk-fhir` build artifacts + removed 2 stray `*.code-workspace` files; fixed broken `@nx/vite:test` in `ts-sdk-sequence`+`ts-sdk-db` (→ `vitest run`); ADR-0031 collision resolved (abdm-m3 → **0033**, README indexed + note); promoted authn deliberation → `docs/architecture/auth/username-primary-authn-deliberation.md`. **Deferred to Phase 1** (same edits get rewritten there): dup `db:migrate` targets, `create-module-databases.sql`, Makefile `db-migrate`. **Needs user confirm:** branch(62)+worktree cleanup, abdm-adapter dead-dir deletion, whether to commit. **Not yet committed.** |
| 2026-06-21 | 1 | **Phase 1 STARTED — empi reference proven end-to-end against real Citus 12.1.** Built shared `applyMigrations`+`createPool` in `ts-sdk-db`; converted empi to drizzle-kit (fresh baseline from `tables.ts` + custom pg_trgm + custom citus-distribute); rewired runtime apply path; deduped project.json. **Verified:** fresh apply + idempotent re-run + 7 tables + tracking table `drizzle.__drizzle_migrations_empi` + pg_trgm/gin index + all 7 tables distributed by `iq_tenant_id` + real `db-migrate` command path. See §12 for the canonical recipe. **Next: fan out the other 7 TS modules + DB reshape. empi reference not yet committed.** |

---

## 12. Phase 1 — proven drizzle-kit migration recipe (empi reference, VERIFIED)

Verified end-to-end on `empi` against real Citus 12.1 (2026-06-21): fresh apply, idempotent re-run, 7 tables distributed by `iq_tenant_id`, pg_trgm + gin index, journaled tracking table. **This is the canonical recipe for the remaining 7 TS modules.**

**Shared infra (DONE):** `packages/ts-sdk-db` now exports `applyMigrations(connectionString, migrationsFolder, { migrationsSchema, migrationsTable })` (runtime `migrate()` from `drizzle-orm/node-postgres/migrator`) and `createPool`. Stale on-disk `.js`/`.d.ts` build artifacts under `ts-sdk-db/src` were deleted (they shadowed the `.ts` under tsx).

**Tracking-table decision:** schema **`drizzle`** (drizzle's own, auto-created — avoids the fresh-DB chicken-egg of the module's own schema, since the generated baseline emits a bare `CREATE SCHEMA "<mod>"` with no `IF NOT EXISTS`), table **`__drizzle_migrations_<module>`** (module-unique — the node-postgres migrator advances by latest-applied timestamp, so a *shared* table makes modules skip each other's pending migrations).

**Extensions + Citus = journaled `--custom` migrations** (issue #66 default), NOT infra bootstrap — so they run wherever `applyMigrations` runs (dev/CI/prod). Journal ⇒ exactly once ⇒ no `DO $$` / `IF NOT EXISTS` / `pg_dist_partition` guards needed.

**Per-module steps:**
1. `drizzle.config.ts`: `schema: ./src/schema/tables.ts`, `out: ./migrations`, `dialect: postgresql`, `schemaFilter: ['<schema>']`, `migrations: { schema: 'drizzle', table: '__drizzle_migrations_<module>' }`.
2. Delete hand-written `migrations/*.sql` + any old `migrations/drizzle/`.
3. Generate fresh, in order: `drizzle-kit generate --custom --name <ext>` per extension (edit → `CREATE EXTENSION IF NOT EXISTS ...`) → `--name init` (baseline) → `--custom --name distribute_citus` (edit: `create_distributed_table('<schema>.<t>','iq_tenant_id')` for tenant tables; **`create_reference_table('<schema>.<t>')` for catalog/control-plane tables FK'd by distributed tables — #92**). Extension must precede any index that needs it.
4. Rewrite `src/schema/apply-migration.ts` → call `applyMigrations(conn, MIGRATIONS_DIR, { migrationsSchema:'drizzle', migrationsTable:'__drizzle_migrations_<module>' })`; **keep the exported `applyXSchemaMigration` name** so boot (`services/*-svc/src/main.ts`) + `scripts/apply-migration.ts` callers are unchanged.
5. `project.json`: remove duplicate `db:migrate` (keep `db-migrate` + `db-generate`).
6. Verify against throwaway Citus: `docker run -d --name hims-verify -e POSTGRES_USER=hims -e POSTGRES_PASSWORD=hims -e POSTGRES_DB=hims_dev -p5444:5432 citusdata/citus:12.1` then `CREATE EXTENSION citus;` — apply ×2, check tables + tracking rows + `pg_dist_partition`. (Dev compose `infra/docker/docker-compose.yml` had a WSL2 bind-mount glitch on `citus-init.sql`; throwaway container sidesteps it.)

**Per-module notes for the fan-out:**
- billing, registration, pharmacy, record-foundation: tenant tables → distribute by `iq_tenant_id` (like empi).
- configurator, user-management: catalog/control-plane tables (modules, permissions, system_roles, organizations, tenants, capabilities) FK-referenced by distributed tables → **`create_reference_table`** (#92), not distribute.
- user-management `auth` schema (better-auth): non-distributable (text PKs) — document as a reference/local exception (ties to AuthN phase, D-decisions there).
- integration-hub: schema lives at `src/integrations/abdm/schema/tables.ts` (not `src/schema/tables.ts`) — adjust config path.
- Extensions seen: pg_trgm (empi). Check each for pgcrypto/`gen_random_uuid` (PG17 has it built-in — verify per image).

**Remaining Phase 1 (after the 7-module fan-out):** OPD `tenant_id`→`iq_tenant_id` (Python/Alembic, D4); master-data schema rename #91 (D17); delete stale `infra/db/create-module-databases.sql` + k8s per-module `*_DATABASE_URL` secrets; fix OPD cross-schema reads into `registration`; rewrite Makefile `db-migrate` ordering; correct `database-principles.md §2` to `iq_tenant_id`.

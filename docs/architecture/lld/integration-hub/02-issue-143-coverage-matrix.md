# Issue #143 — documentation coverage matrix

**Purpose:** Verify every item from [GitHub issue #143](https://github.com/IQ-Line/HospitalSaarthi/issues/143) (body + pasted comments) is captured in repo docs, with explicit **implement / defer / reference-only** status.

**Authoritative implementation spec:** [01-phase-1a-restructure-and-multi-tenant.md](./01-phase-1a-restructure-and-multi-tenant.md)  
**Safe execution:** [03-safe-migration-and-cutover.md](./03-safe-migration-and-cutover.md)  
**Developer checklist:** [../../guides/integration-hub-phase-1a-implementation.md](../../guides/integration-hub-phase-1a-implementation.md)

> **Ayush Wardhan (issue comment 2026-05-29):** Attached comments are **outdated / deferred**. Only the **issue body** drives Phase 1a implementation. Comments are indexed here so nothing is lost for future issues.

---

## Issue body — coverage

| Issue body section | Documented in | Status |
|--------------------|---------------|--------|
| Context (Phase 0 single-tenant) | 01 §1 | Complete |
| Goal 1: directory shape | 01 §2, implementation guide §1 | Complete |
| Goal 2: multi-tenant credentials | 01 §3, implementation guide §3 | Complete |
| Deferred generic infra | 01 §6, implementation guide §6 | Complete |
| Target tree (`integration-hub`, `configurator`) | 01 §2 | Complete |
| `tenant_integration_profiles` columns | 01 §3.1 | Complete |
| Plaintext secrets Phase 1a | 01 §3.1 | Complete |
| `integrationContextResolver` middleware | 01 §3.2, 03 §4 | Complete (+ callback nuance in 03) |
| What stays identical | 01 §4 | Complete |
| What changes structurally | 01 §5 | Complete |
| Eight tables schema rename | 01 §5.1 | Complete |
| Phase 1b+ deferrals table | 01 §6 | Complete |
| P0 env removed | 01 §7.1 | Complete |
| P1 env renamed | 01 §7.2, 01 §7.4 (extra vars) | Complete |
| P2 test env unchanged | 01 §7.3 | Complete |
| Changes outside module | 01 §8 | Complete |
| Migration parts A–D | 01 §9, implementation guide §2 | Complete |
| Effort estimate | 01 §10 | Complete |
| Open items (gateway xCmId, cache, HIP map, Fidelius) | 01 §11, 03 §6 | Complete |
| References (04-orchestration, ADR-0030, DEVNOTE, schema) | 01 §12 | Complete |

---

## Issue comments — coverage

| Comment | Content | Phase 1a action | Where captured |
|---------|---------|-----------------|----------------|
| ADR-0030 (full paste) | Why Phase 0 exists; port discipline | **Reference only** — already in repo [`adr/0030`](../../adr/0030-abdm-adapter-prototype-phase.md) | 01 §12; matrix row below |
| ADR-0030 follow-up: tenant credentials | Replace env-only model | **Phase 1a delivers** via `tenant_integration_profiles` | 01 §3, 03 §1 |
| ADR-0030 follow-up: port to `integration_workflows` | FSM engine | **Defer** | 01 §6 |
| 04-orchestration HTTP-first (full paste) | Timer worker, flows/activities, portability rules | **Defer** (not Phase 1a) | 01 §6, §12 historical |
| DEVNOTE transition (full paste) | 13 tables, atomic-transition, 3–4 week estimate | **Defer** | 01 §12; [integration-platform/schema-reference.json](../integration-platform/schema-reference.json) exists in repo |
| DEVNOTE open Q: port 3005 vs 3007 | Service port | **Decision:** keep **3007** unless devops standardises 3005 — document in 03 §5 | 03-safe-migration §5 |
| DEVNOTE open Q: parallel vs big-bang cutover | Release strategy | **Documented** | 03 §2 |
| DEVNOTE open Q: `@hims/ts-sdk-secrets` | Secrets package | **Defer** — inline `PerTenantSecretsClient` + `env:` fallback | 01 §3.2, 03 §6 |
| DEVNOTE open Q: OpenAPI rename | Spec name | **Implement** `integration-hub.v1.yaml` | 01 §8 |
| DEVNOTE open Q: Nx naming | Project names | **Implement** `integration-hub` / `integration-hub-svc` | 01 §8 |
| schema-reference.json (full paste) | 13 target tables | **Defer** — Phase 1a keeps **8** tables only | 01 §5.1, §6 |
| Ayush scope note | Comments outdated | **Authoritative** | 01 intro, implementation guide §7 |

---

## Gaps found in first doc pass — now addressed

| Gap | Risk if missed | Resolution |
|-----|----------------|------------|
| `/api/v3` callbacks resolve tenant **before** `x-tenant-id`; closure `adapterDeps` has single `xHipId` | **Wrong tenant credentials on callbacks** | [03-safe-migration §4](./03-safe-migration-and-cutover.md#4-callback-routes-vs-platform-routes) |
| `registerM2EventConsumers` wired with boot-time `xHipId` | **Wrong HIP on async M2 paths** | 03 §4.3 |
| Deployment env vars in code but not in issue P1 table (`ABDM_M3_PUSH_*`, link-token poll, etc.) | Incomplete `.env.example` after rename | 01 §7.4 |
| No PR / rollback / data-copy strategy | Large-bang breakage | 03 §2–3 |
| No file-level touch list | Missed handler during refactor | 03 §7 |
| `integration-profiles.port.ts` vs folder `integrations-profiles/` | Scaffold confusion | 01 §2 (clarified naming) |
| `ABDM_ADAPTER_MODULE_KEY` rename | Import breaks | 01 §9 step 11, 03 §7 |
| Configurator CRUD for profiles | Can't seed without SQL | 01 §2, implementation guide (SQL seed); CRUD optional in Part A |

---

## Codebase inventory (verified 2026-05-29)

Use when checking “did we touch everything?”

### Rest handlers to refactor (Part B)

| File | Route group |
|------|-------------|
| `rest-handlers/m0/gateway-session.probe.ts`, `m0/index.ts` | Platform |
| `rest-handlers/m1/m1-routes.ts`, `m1/index.ts` | Platform |
| `rest-handlers/m2/m2-platform-routes.ts` | Platform |
| `rest-handlers/m2/m2-callback-routes.ts` | Callback (`/api/v3`) |
| `rest-handlers/m2/m2-inbound-helper.ts` | Shared callback runner |
| `rest-handlers/m3/m3-platform-routes.ts` | Platform |
| `rest-handlers/m3/m3-callback-routes.ts` | Callback (`/api/v3`) |
| `router.ts` | Plugin registration |

### Data-access / lib to refactor

| File | Change |
|------|--------|
| `data-access/gateway-client.http.ts` | Per-tenant `xCmId`; token cache policy |
| `data-access/sms-client.ts` | `createSmsClientFromProfile` |
| `data-access/env-secrets.client.ts` | Fallback only |
| `lib/resolve-callback-tenant.ts` | DB `hip_id` → tenant |
| `lib/hip-tenant-map.ts` | Remove or dev-only fallback |
| `lib/m3-runtime-env.ts` | `callback_base_url` from profile where needed |
| `events/register-m2-consumers.ts` | Per-tenant deps from event envelope `iq_tenant_id` (Code PR 2) |

### Service bootstrap

| File | Change |
|------|--------|
| `services/abdm-adapter-svc/src/main.ts` | → `integration-hub-svc`; middleware; no P0 env |
| Janitor inline `setInterval` | → `workers/janitor.ts` |

### Configurator (Part A)

| File | Change |
|------|--------|
| `modules/configurator/src/schema/tables.ts` | `tenant_integration_profiles` |
| `modules/configurator/migrations/007_*.sql` | DDL + partial unique on `hip_id` |
| `modules/configurator/src/data-access/tenant-integration-profile.repo.ts` | `DrizzleTenantIntegrationProfilesRepo` |
| `modules/configurator/src/rest-handlers/tenant-integration-profiles.handler.ts` | REST CRUD + `GET /integration-profiles/by-hip/:hipId` |
| `scripts/seed-abdm-profile-from-env.mts` | env → profile row |
| `modules/integration-hub/` | scaffold + `integrations/abdm/` copy + lib stubs |
| `modules/configurator/src/index.ts` | exports |

### Tests to update after move

- `lib/resolve-callback-tenant.test.ts`
- `rest-handlers/m2/m2-inbound-helper.test.ts`
- All `*.sandbox.integration.test.ts` under `use-cases/` — build deps from profile or test factory
- `test-utils/m3-sandbox-harness.ts`, `test-utils/sandbox-env.ts`

---

## PR #144 round-2 review (incorporated)

| Review item | Resolution |
|-------------|------------|
| `m0-routes.ts` path wrong | Fixed → `gateway-session.probe.ts` + `m0/index.ts` |
| Events lack `iqTenantId` | Envelope `iq_tenant_id` required by `DomainEvent`; Code PR 2 uses `event.iq_tenant_id` — see 03 §4.3 |
| `m2-inbound-helper.test.ts` missing from test list | Listed under Tests to update |
| Gateway cache two options | **Disable** in Code PR 2 — 03 §6, 01 §11 |
| §7.4 vars without renames | §7.4 table + §7.5 alias reference |
| `normalizeIntegrationHubEnvAliases` unspecified | §7.5 codifies §7.2 + §7.4 + Postman aliases |

## PR #144 review follow-up (incorporated)

| Review item | Resolution |
|-------------|------------|
| PR title implies code done | README + 01 intro: **docs only**; suggest title `docs(integration-hub): Phase 1a spec` |
| 03 jumps §1 → §3 | Added [03 §2 Recommended code PR sequence](./03-safe-migration-and-cutover.md#2-recommended-code-pr-sequence) |
| `ABDM_DEV_TENANT_ID` inconsistent | Unified policy in [03 §2.1](./03-safe-migration-and-cutover.md#21-abdm_dev_tenant_id-policy) + 01 §3.2 / §7.1 |
| `hip_id` uniqueness | Partial unique index spec in 01 §3.1 + 03 §3.1 |
| `buildAbdmDepsForTenant` unspecified | Full TypeScript sketch in [01 §3.3](./01-phase-1a-restructure-and-multi-tenant.md#33-buildabdmdepsfortenant-canonical-factory) |
| Part A SQL-only | CRUD + seed script **required** in Code PR 1 |
| Single vs multi PR | **Docs PR #144** then **four code PRs** (safer than one mega-PR) |

## Sign-off checklist

**Documentation (PR #144):**

- [x] Issue body fully reflected in `01-phase-1a`
- [x] Comment scope (defer vs implement) explicit
- [x] Safe migration / callback deps documented
- [x] Extra deployment env vars beyond issue table
- [x] File touch list aligned with repo
- [x] PR #144 review items addressed (2026-05-29)

**Implementation (strict order — same as plan flowchart):**

- [x] Step 0 — PR #144 docs
- [x] Step 1 — Code PR 1 / Part A (branch `step-1-code-pr-1`)
- [ ] Step 2 — Code PR 2 / Part B (after Code PR 1)
- [ ] Step 3 — Code PR 3 / Part C (after Code PR 2)
- [ ] Step 4 — Code PR 4 / Part D (after Code PR 3)

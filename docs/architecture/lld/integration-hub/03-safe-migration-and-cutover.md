# Phase 1a — safe migration and cutover

**Audience:** Developers executing [#143](https://github.com/IQ-Line/HospitalSaarthi/issues/143). Read with [01-phase-1a](./01-phase-1a-restructure-and-multi-tenant.md) and the [implementation guide](../../guides/integration-hub-phase-1a-implementation.md).

This is a **large, critical change**. The goal is zero behavioural regression for existing M1/M2/M3 sandbox flows while introducing per-tenant credentials.

---

## 1. Principles

1. **Issue body only for scope** — do not pull in 13-table schema, timer worker, `atomic-transition`, or `flows/`/`activities/` split from issue comments.
2. **Use-cases unchanged** — still `(input, deps)`; only **how `deps` is built** changes.
3. **Additive first** — Part A merges without deleting `abdm-adapter` until Part D.
4. **Same protocol surface** — URL paths, request/response shapes, Fidelius behaviour ([12-phr-push-reconciliation](../abdm-adapter/12-phr-push-reconciliation.md) unchanged).
5. **Test before delete** — full smoke (implementation guide §4) before removing Phase 0 module.

---

## 2. Recommended code PR sequence

Use **four code PRs** after the documentation PR ([#144](https://github.com/IQ-Line/HospitalSaarthi/pull/144) or `docs(integration-hub): Phase 1a spec`). Do not label the docs PR as “implementation complete.”

| PR | Issue Part | Contents | Merge gate |
|----|------------|----------|------------|
| **Code 1** | A (foundation) | `tenant_integration_profiles` migration + Drizzle; **configurator-svc REST CRUD** + **seed script**; scaffold `integration-hub`; copy `integrations/abdm/` (no behaviour change); `buildAbdmDepsForTenant` stub | Configurator tests; profile API works; `abdm-adapter-svc` still runs unchanged |
| **Code 2** | B (multi-tenant) | `integrationContextResolver`; `/api/v3` preHandler; all rest-handlers + gateway/sms/secrets; M2 event consumers; `resolve-callback-tenant` → DB | Unit tests green; callback + multi-tenant deps verified |
| **Code 3** | C (schema + service) | `integration_hub` migrations; `integration-hub-svc` bootstrap; env `INTEGRATION_HUB_*` aliases; janitor extract | `integration-hub-svc:serve` + health + M1 request with profile |
| **Code 4** | D (cleanup) | Delete `abdm-adapter` / `abdm-adapter-svc`; Makefile/docker/OpenAPI; data copy script; full regression matrix §8 | M3 `full-loop.sh`; optional sandbox tests |

**Why four PRs (not one):** Part B (callbacks + event bus) is the highest regression risk; isolating it makes review and rollback easier while still delivering #143 end-to-end.

**Rollback:** Revert the failing PR only; keep `abdm_adapter` schema until Code 4 merges.

---

## 3. Database cutover

### 3.1 New objects (Part A)

- `configurator.tenant_integration_profiles`
- **Unique:** `(iq_tenant_id, integration_kind)` — one active ABDM profile per tenant
- **Unique (Phase 1a decision):** `(hip_id)` where `integration_kind = 'abdm' AND is_active = true` — one tenant per HIP for callback routing (replaces `ABDM_HIP_TENANT_MAP` 1:1 semantics). Use a partial unique index in migration SQL
- **Non-unique index:** `(iq_tenant_id)` on profiles for admin list queries
- **Part A deliverables (required, not optional):** REST CRUD on `configurator-svc` **and** `scripts/seed-abdm-profile-from-env.mjs` (or documented `make seed-abdm-profile`) so devs are not blocked on raw SQL only

### 3.2 Schema rename (Part C)

Copy data, do not lose sessions mid-sandbox test:

```sql
-- Example: after integration_hub migrations exist
INSERT INTO integration_hub.abdm_sessions
SELECT * FROM abdm_adapter.abdm_sessions;
-- Repeat for all 8 tables. Verify row counts match.
```

**Dev shortcut:** drop and re-migrate if no valuable session data.

### 3.3 Profile seed before cutover

Every tenant UUID used in tests (`ABDM_DEV_TENANT_ID`, `ABDM_SANDBOX_TEST_TENANT_ID`) must have a profile row **before** removing P0 env vars. See implementation guide §3.

---

## 4. Callback routes vs platform routes

### 4.1 Platform routes (`/api/abdm/v1/*`)

Today:

```
tenantPlugin → handler uses closure adapterDeps (single xHipId)
```

Target:

```
tenantPlugin → integrationContextResolver → request.integrationCtx.deps
```

`integrationContextResolver` loads profile by `request.iqTenantId` (from `x-tenant-id`).

### 4.2 Callback routes (`/api/v3/*`)

Today (see `services/abdm-adapter-svc/src/main.ts`):

- Registered **outside** `/api` + `tenantPlugin`
- `runInboundCallback` calls `resolveCallbackTenantId(headers)` then uses **same** closure `adapterDeps` for all tenants

**This is the highest-risk bug** if only platform routes get per-request deps.

Target:

```
/api/v3 hook:
  1. resolve iqTenantId from hip_id (DB) OR x-tenant-id header (dev scripts)
  2. load tenant_integration_profiles
  3. build AbdmAdapterDeps for that tenant (shared repos + per-tenant gateway/sms/secrets/xHipId/…)
  4. attach request.integrationCtx
  5. runInboundCallback(..., deps: request.integrationCtx.deps)
```

Implement either:

- **Option A:** `preHandler` on `/api/v3` that sets `integrationCtx` after tenant resolution, or
- **Option B:** extend `runInboundCallback` to call `buildAbdmDepsForTenant(iqTenantId, app.sharedInfra)` internally after step 1

Do **not** use boot-time `xHipId` in callback handlers after Part B.

### 4.3 M2 event consumers

`registerM2EventConsumers(eventBus, adapterDeps)` currently receives boot-time deps including `xHipId`.

Target: consumer handler receives `iqTenantId` from event payload → `buildAbdmDepsForTenant(iqTenantId, …)` → invoke use-case.

Shared across tenants (safe as singletons):

- Drizzle repos (`sessions`, `inboundMessages`, …)
- `fidelius`, `payloadEncryptor` (Phase 1a)
- `eventBus`

Per-tenant (must not be singleton):

- `gateway` client config (`xCmId`, OAuth credentials)
- `sms` client
- `secrets` resolving client_id/secret
- `xHipId`, `xHiuId`, `defaultSmsPhoneNo`, `hipDisplayName`

---

## 5. Service port and naming

| Topic | Recommendation |
|-------|----------------|
| Port | Keep **3007** for continuity (`INTEGRATION_HUB_SVC_PORT` default 3007) unless platform standardises 3005 |
| Package names | `@hims/integration-hub`, `@hims/integration-hub-svc` |
| OpenAPI | Rename to `integration-hub.v1.yaml`; keep `/api/abdm/v1` prefix in paths for client compatibility |
| Env aliases | Extend `normalizeAbdmEnvAliases()` → `normalizeIntegrationHubEnvAliases()` reading **both** old and new names through Phase 1a |

---

## 6. Open implementation decisions (from issue §11)

| Item | Phase 1a recommendation | Rationale |
|------|-------------------------|-----------|
| `gateway-client` `xCmId` | Pass via `AbdmAdapterDeps.xCmId`; set from profile when building deps | Matches existing use-case reads |
| Gateway token cache | **Disable** or key cache by `(iqTenantId, gateway_environment)` | Sandbox-safe; issue allows disable |
| Callback HIP lookup | DB query + optional in-memory LRU (TTL 60s) | Correctness first; optimize if needed |
| `ABDM_DEV_TENANT_ID` | See [§2.1 `ABDM_DEV_TENANT_ID` policy](#21-abdm_dev_tenant_id-policy) below | Resolved vs §7.1 in 01-phase-1a |
| Fidelius per-tenant | **No change** | Issue defers to 1b+ |

### 2.1 `ABDM_DEV_TENANT_ID` policy

**Single rule (resolves doc inconsistency):**

| Variable | Role in Phase 1a |
|----------|------------------|
| `ABDM_X_HIP_ID`, `ABDM_HIP_TENANT_MAP`, etc. | **Removed** from integration-hub-svc env — values live in `tenant_integration_profiles` |
| `ABDM_DEV_TENANT_ID` | **Stays deployment-only** on integration-hub-svc for **callback tenant resolution fallback only** when: (1) `X-HIP-ID` / DB lookup finds no profile, and (2) `x-tenant-id` header absent. Log `warn` with code `abdm.callback.dev_tenant_fallback`. **Not** used for platform `/api/abdm/v1` routes — those require a profile row for `x-tenant-id` or return 404 |

Platform routes must **fail closed** without a profile. Callbacks may use dev fallback temporarily until every sandbox HIP has a seeded profile.

---

## 7. Complete file touch list

See [02-issue-143-coverage-matrix.md § Codebase inventory](./02-issue-143-coverage-matrix.md#codebase-inventory-verified-2026-05-29).

Additionally update references in:

- `tsconfig.base.json` paths
- `nx.json` / `project.json` for both projects
- `tools/dockerfile-for-svc.sh`, `Makefile`, `infra/devops-handoff.md`
- `services/web/.env.example` (comments only)
- `docs/guides/abdm-adapter-*.md` — add banner pointing to integration-hub docs (optional, low priority)

---

## 8. Regression matrix (must pass before Part D)

| Area | Command / action |
|------|------------------|
| Unit tests | `npx nx run integration-hub:test` (or `abdm-adapter:test` until rename) |
| M1 sandbox (if creds) | `ABDM_RUN_LIVE_NHA_SANDBOX=1` integration tests |
| M2 mock | User-initiated link with `INTEGRATION_HUB_ABDM_M2_MOCK_PLATFORM=true` |
| M3 mock loop | `integrations/abdm/scripts/m3/full-loop.sh` |
| Callback dedupe | Replay same `REQUEST-ID` → 200, no double side-effect |
| Multi-tenant | Two profiles, two tenants — verify HIP headers on outbound gateway calls |
| PHR push | Live/sandbox path per [12-phr-push-reconciliation](../abdm-adapter/12-phr-push-reconciliation.md) |

---

## 9. What must NOT change in Phase 1a

- Fidelius encrypt/decrypt implementation
- HTTP route paths and methods
- `AbdmSession` / flow kinds / FSM state constant names
- Consent signature verification rules
- Record Foundation / EMPI client contracts
- Event names and payloads
- Table **column** definitions (only schema **name** `abdm_adapter` → `integration_hub`)

---

## 10. ADR-0030 alignment

Phase 1a closes ADR-0030 follow-up: *“Tenant credential provisioning: replace env-var-only model.”*

It does **not** close:

- Port to `integration_workflows` / FSM engine
- Citus `create_distributed_table` (still pre-production)
- Telemetry `TODO(metrics)` markers

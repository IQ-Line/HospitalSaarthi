# Integration Hub — Phase 1a: Restructure and per-tenant credentials

**Status:** Implementation spec (from [GitHub issue #143](https://github.com/IQ-Line/HospitalSaarthi/issues/143))  
**Date:** 2026-05-29  
**Assignees:** Ayush Wardhan, Kamal Jeet Arya

> **Scope note (issue comment 2026-05-29):** Comments attached to #143 paste older platform LLDs (13-table schema, FSM engine, `atomic-transition`, full env inventory from a broader transition analysis). Those decisions are **outdated or deferred** for this sprint. **This document and the issue body are authoritative for Phase 1a.**

> **Docs vs code:** PR **#144** (or equivalent) is **documentation only** — it does not ship `integration-hub`, `integration-hub-svc`, or `tenant_integration_profiles` code. Use title `docs(integration-hub): Phase 1a spec`.
>
> **Development order:** `#144` → Code PR 1 (Part A) → Code PR 2 (Part B) → Code PR 3 (Part C) → Code PR 4 (Part D). See [README](./README.md#pr-roadmap-strict-order--develop-sequentially) or [03-safe-migration §2](./03-safe-migration-and-cutover.md#2-recommended-code-pr-sequence). **Do not skip steps.**

---

## 1. Context

`modules/abdm-adapter/` + `services/abdm-adapter-svc/` is a Phase 0 prototype ([ADR-0030](../../adr/0030-abdm-adapter-prototype-phase.md)). It runs as a **single-tenant** service: ABDM gateway credentials (HIP ID, HIU ID, CM ID, OAuth2 client, SMS config) are read from environment variables at boot and shared across every tenant.

Phase 1a delivers two outcomes:

1. **Directory shape** — `modules/integration-hub/` as the integration platform module, with ABDM under `integrations/abdm/`.
2. **Multi-tenant credentials** — tenant-specific gateway credentials in `configurator.tenant_integration_profiles`, resolved **per request** instead of at boot from env.

Generic shared infra (transition audit, timer worker, outbound logging, integration registry CRUD) stays deferred until a second integration justifies it.

---

## 2. Target layout

```
modules/integration-hub/                    @hims/integration-hub
  src/
    index.ts                                public API
    router.ts                               fastify-plugin wrapping ABDM routes
    schema/
      tables.ts                             8 ABDM tables → integration_hub schema
    integrations/
      abdm/                                 copied from modules/abdm-adapter/src/
        use-cases/                          unchanged (input, deps) signatures
        rest-handlers/                      REFACTORED → request.integrationCtx.deps
        data-access/                        REFACTORED → per-tenant gateway, sms, secrets
        domain/                             unchanged
        events/                             unchanged
        lib/                                unchanged (+ callback tenant via DB)
    lib/
      integration-context.ts                NEW per-request deps bag + resolver
      per-tenant-secrets.ts                 NEW SecretsClient backed by profile row
      integration-profile-repo.ts           NEW port + Drizzle read against configurator
    workers/
      janitor.ts                            MOVED from abdm-adapter-svc main.ts

services/integration-hub-svc/               @hims/integration-hub-svc
  src/
    main.ts                                 REFACTORED — no P0 env reads; middleware
    load-env.ts                             deployment-level vars only
    resolve-database-url.ts
    http-errors.ts

modules/configurator/                       changeset
  src/
    schema/tables.ts                        ADD tenant_integration_profiles
    integration-profiles/                   NEW (folder name; issue also says integrations-profiles/)
      integration-profiles.port.ts          port interface
      rest-handlers.ts                    REST CRUD (required in Part A)
      data-access/                        DrizzleTenantIntegrationProfilesRepo
    scripts/
      seed-abdm-profile-from-env.mjs      dev seed from legacy .env (required in Part A)
```

**Configurator naming:** Issue #143 uses `integrations-profiles/` in the tree diagram and `integration-profiles.port.ts` as the port file — pick **one folder** (`integration-profiles/`) and stay consistent in code.

---

## 3. Multi-tenant credential model

### 3.1 Table: `configurator.tenant_integration_profiles`

Stores per-tenant ABDM gateway fields that are env vars today:

| Column | Type | Maps from (Phase 0 env) |
|--------|------|-------------------------|
| `id` | `uuid PK` | — |
| `iq_tenant_id` | `uuid NOT NULL` | FK → `configurator.tenants` |
| `integration_kind` | `text NOT NULL` | `'abdm'` |
| `is_active` | `boolean NOT NULL DEFAULT true` | — |
| `hip_id` | `text NOT NULL` | `ABDM_X_HIP_ID` |
| `hiu_id` | `text NOT NULL` | `ABDM_X_HIU_ID` |
| `cm_id` | `text NOT NULL DEFAULT 'sbx'` | `ABDM_X_CM_ID` |
| `client_id` | `text` | `ABDM_SANDBOX_CLIENT_ID` |
| `client_secret` | `text` | `ABDM_SANDBOX_CLIENT_SECRET` |
| `default_sms_phone` | `text` | `ABDM_DEFAULT_SMS_PHONE` |
| `hip_display_name` | `text` | `ABDM_HIP_DISPLAY_NAME` |
| `callback_base_url` | `text` | `ABDM_ADAPTER_PUBLIC_BASE_URL` |
| `sms_provider` | `text` | `ABDM_SMS_PROVIDER` |
| `sms_config` | `jsonb` | all `ABDM_SMS_*` provider fields |
| `gateway_environment` | `text DEFAULT 'sandbox'` | implied by gateway base URL |
| `created_at` / `updated_at` | `timestamptz` | — |

**Unique constraints (Drizzle + migration):**

- `(iq_tenant_id, integration_kind)` — one ABDM profile row per tenant
- **Partial unique** on `hip_id` where `integration_kind = 'abdm' AND is_active = true` — at most one active tenant per HIP (same semantics as today's `ABDM_HIP_TENANT_MAP` JSON map)

**Secrets (Phase 1a):** `client_id` and `client_secret` stored **plaintext** — no production deployment yet. Encryption/vault is Phase 1b+.

**HIP → tenant lookup:** `findActiveByHipId(hipId)` on repo (replaces `parseHipTenantMap()` / `ABDM_HIP_TENANT_MAP`).

### 3.2 Runtime: `integrationContextResolver` middleware

On every request:

1. Read `iqTenantId` from the request (existing `tenantPlugin`).
2. Load active ABDM profile from `configurator.tenant_integration_profiles`.
3. Build per-request deps:
   - `xHipId`, `xHiuId`, `xCmId`, `defaultSmsPhoneNo`, `hipDisplayName` from profile
   - `secrets` → `PerTenantSecretsClient` (profile row; `env:` fallback for dev)
   - `sms` → `SmsClient` from `sms_provider` + `sms_config`
4. Attach to `request.integrationCtx`.

**Handlers** use `request.integrationCtx.deps`, not a closure-captured `adapterDeps` at plugin register time.

**Use-cases** stay `(input, deps)` — no signature change.

**Callbacks:** `lib/resolve-callback-tenant.ts` resolves tenant by `hip_id` → `findActiveByHipId` (not `ABDM_HIP_TENANT_MAP`).

**`ABDM_DEV_TENANT_ID` policy:** Removed from “credential” env (§7.1). **Kept** as deployment-only **callback fallback** when HIP DB lookup and `x-tenant-id` both fail — see [03-safe-migration §2.1](./03-safe-migration-and-cutover.md#21-abdm_dev_tenant_id-policy). Platform routes require a profile or return 404.

**Critical:** `/api/v3` gateway callbacks are **not** behind `tenantPlugin` today. After resolving `iqTenantId` from `X-HIP-ID`, you must **build `deps` for that tenant** — do not reuse a single boot-time `adapterDeps`. See [03-safe-migration-and-cutover.md §4](./03-safe-migration-and-cutover.md#4-callback-routes-vs-platform-routes).

**Fastify types:** Extend `FastifyRequest` with `integrationCtx: { profile, deps: AbdmAdapterDeps }` (module `fastify.d.ts`).

**Shared vs per-tenant in `deps`:**

| Singleton (process-wide) | Per-tenant (from profile) |
|--------------------------|-------------------------|
| Drizzle repos, `fidelius`, `payloadEncryptor`, `eventBus`, EMPI/RF clients (deployment URL) | `gateway`, `sms`, `secrets`, `xHipId`, `xHiuId`, `xCmId`, `defaultSmsPhoneNo`, `hipDisplayName` |

### 3.3 `buildAbdmDepsForTenant()` (canonical factory)

Referenced in [03-safe-migration](./03-safe-migration-and-cutover.md); implemented in `modules/integration-hub/src/lib/build-abdm-deps.ts`.

```typescript
/** Process-wide: constructed once in integration-hub-svc main.ts */
export interface IntegrationHubSharedInfra {
  db: DbInstance;
  deployment: {
    gatewayBaseUrl: string;
    abhaApiBaseUrl: string;
    gatewayTimeoutMs?: number;
  };
  sessions: AbdmSessionsPort;
  inboundMessages: InboundMessagesPort;
  linkTokens: LinkTokensPort;
  consentArtefacts: ConsentArtefactsPort;
  m3ConsentRequests: M3ConsentRequestsPort;
  m3ConsentArtefactsHiu: M3ConsentArtefactsHiuPort;
  m3DataTransfers: M3DataTransfersPort;
  empi: EmpiClient;
  recordFoundation: RecordFoundationClient;
  fidelius: FideliusEncryptor;
  payloadEncryptor: PayloadEncryptor;
  dataPush?: HipDataPushClient;
  linkOtpStore: LinkOtpStorePort;
  eventBus?: EventBus;
  profiles: TenantIntegrationProfilesPort;
}

export interface TenantIntegrationProfile {
  id: string;
  iqTenantId: string;
  integrationKind: "abdm";
  hipId: string;
  hiuId: string;
  cmId: string;
  clientId: string | null;
  clientSecret: string | null;
  defaultSmsPhone: string | null;
  hipDisplayName: string | null;
  callbackBaseUrl: string | null;
  smsProvider: string | null;
  smsConfig: Record<string, unknown>;
  gatewayEnvironment: string;
}

/** Builds a fresh AbdmAdapterDeps for one tenant — call per request / per callback / per event. */
export async function buildAbdmDepsForTenant(
  iqTenantId: string,
  shared: IntegrationHubSharedInfra,
): Promise<AbdmAdapterDeps>;

export interface IntegrationContext {
  iqTenantId: string;
  profile: TenantIntegrationProfile;
  deps: AbdmAdapterDeps;
}
```

`integrationContextResolver` and `/api/v3` preHandler both call `buildAbdmDepsForTenant` after resolving `iqTenantId`.

---

## 4. What stays identical

- Use-case signatures `(input, deps)`
- Domain types, value objects, entity lifecycle
- Event types, publishers, consumers
- Drizzle repository classes for the 8 existing ABDM tables
- Fidelius crypto (not per-tenant in Phase 1a)
- Payload encryptor (`INTEGRATION_HUB_TOKEN_ENCRYPTION_KEY` / current token key env)
- Route paths and HTTP methods
- Janitor logic (file move only)
- Consent artefact signature verification
- Gateway JWS verification config

---

## 5. What changes structurally

| Area | Current (Phase 0) | After Phase 1a |
|------|-------------------|----------------|
| Credential source | `process.env` at boot | `tenant_integration_profiles` per request |
| Dependency injection | Singleton `AbdmAdapterDeps` | Per-request deps from middleware |
| Rest handler deps | Closure at plugin register | `request.integrationCtx.deps` |
| Callback tenant | `ABDM_HIP_TENANT_MAP` env JSON | DB lookup by `hip_id` |
| `SecretsClient` | `env:VAR` from `process.env` | Profile row (+ `env:` fallback) |
| `GatewayClient.xCmId` | Constructor-injected | Per-tenant deps / per-call |
| `SmsClient` | Singleton from env | Per-tenant from profile |
| Service bootstrap | ~46 ABDM env vars | ~30 deployment-level vars |
| PostgreSQL schema | `abdm_adapter` | `integration_hub` |
| Module key | `ABDM_ADAPTER_*` | `INTEGRATION_HUB_*` / `ABDM_MODULE_KEY` |

### 5.1 Eight tables (schema rename only)

Same columns as today in `modules/abdm-adapter/src/schema/tables.ts`:

| Current table | Target (`integration_hub`) |
|---------------|----------------------------|
| `abdm_sessions` | `abdm_sessions` |
| `abdm_inbound_messages` | `abdm_inbound_messages` |
| `abdm_link_tokens` | `abdm_link_tokens` |
| `abdm_link_otps` | `abdm_link_otps` |
| `abdm_m3_consent_requests` | `abdm_m3_consent_requests` |
| `abdm_m3_consent_artefacts_hiu` | `abdm_m3_consent_artefacts_hiu` |
| `abdm_m3_data_transfers` | `abdm_m3_data_transfers` |
| `abdm_consent_artefacts` | `abdm_consent_artefacts` |

Data migration: copy `abdm_adapter.*` → `integration_hub.*` before deleting old module (or run fresh migrations in dev).

---

## 6. Deferred (Phase 1b+)

| Component | When |
|-----------|------|
| `integrations` registry + CRUD | Second integration |
| `integration_workflow_transitions` (audit) | Workflow debugging need |
| `integration_timers` + timer worker | Durable scheduling justified |
| `integration_inbound/outbound_messages` (generic) | Cross-integration tracing |
| `atomic-transition.ts` | State write ordering requirement |
| Idempotency middleware (generic) | Callback duplication in prod |
| Consent merge (3→2 tables) | Schema cleanup sprint |
| `link_otps` fold into session | Table reduction |
| Secret encryption at rest | Production |
| Vault integration | Production |
| Per-tenant Fidelius key material | Production |
| Gateway token cache per `(tenant, env)` | Multi-tenant prod (MVP: disable cache OK for sandbox) |

---

## 7. Environment variables

### 7.1 Removed from env (live in DB profile)

- `ABDM_X_HIP_ID`, `ABDM_X_HIU_ID`, `ABDM_X_CM_ID`
- `ABDM_SANDBOX_CLIENT_ID`, `ABDM_SANDBOX_CLIENT_SECRET`
- `ABDM_DEFAULT_SMS_PHONE`, `ABDM_HIP_DISPLAY_NAME`
- `ABDM_ADAPTER_PUBLIC_BASE_URL`
- `ABDM_HIP_TENANT_MAP` (replaced by DB `hip_id` lookup)
- `ABDM_DEV_TENANT_ID` is **not** a credential — see §3.2 / [03 §2.1](./03-safe-migration-and-cutover.md#21-abdm_dev_tenant_id-policy) for callback-only fallback on integration-hub-svc
- `ABDM_SMS_PROVIDER` and all `ABDM_SMS_*` provider vars

### 7.2 Renamed (deployment-level)

| Old | New |
|-----|-----|
| `ABDM_ADAPTER_SVC_PORT` | `INTEGRATION_HUB_SVC_PORT` |
| `ABDM_DATA_DATABASE_URL` | `INTEGRATION_HUB_DATABASE_URL` |
| `ABDM_GATEWAY_BASE_URL` | `INTEGRATION_HUB_ABDM_GATEWAY_BASE_URL` |
| `ABDM_ABHA_API_BASE_URL` | `INTEGRATION_HUB_ABDM_ABHA_API_BASE_URL` |
| `ABDM_GATEWAY_JWKS_URL` | `INTEGRATION_HUB_ABDM_GATEWAY_JWKS_URL` |
| `ABDM_FIDELIUS_USE_STUB` | `INTEGRATION_HUB_ABDM_FIDELIUS_USE_STUB` |
| `ABDM_M3_MOCK_GATEWAY` | `INTEGRATION_HUB_ABDM_M3_MOCK_GATEWAY` |
| `ABDM_M3_LOOPBACK_HIU` | `INTEGRATION_HUB_ABDM_M3_LOOPBACK_HIU` |
| `ABDM_M3_DATA_PUSH_URL_ALLOWLIST` | `INTEGRATION_HUB_ABDM_M3_DATA_PUSH_URL_ALLOWLIST` |
| `ABDM_JANITOR_INTERVAL_MS` | `INTEGRATION_HUB_JANITOR_INTERVAL_MS` |
| `ABDM_SESSION_TTL_HOURS` | `INTEGRATION_HUB_ABDM_SESSION_TTL_HOURS` |
| `ABDM_GATEWAY_TIMEOUT_MS` | `INTEGRATION_HUB_ABDM_GATEWAY_TIMEOUT_MS` |
| `ABDM_TOKEN_ENCRYPTION_KEY` | `INTEGRATION_HUB_TOKEN_ENCRYPTION_KEY` |
| `ABDM_ALLOW_INSECURE_CALLBACKS` | `INTEGRATION_HUB_ALLOW_INSECURE_CALLBACKS` |
| `ABDM_ALLOW_PLAINTEXT_TOKENS` | `INTEGRATION_HUB_ALLOW_PLAINTEXT_TOKENS` |
| `ABDM_OTP_RATE_LIMIT_*` | `INTEGRATION_HUB_ABDM_OTP_RATE_LIMIT_*` |
| `ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS` | `INTEGRATION_HUB_ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS` |
| `ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS` | `INTEGRATION_HUB_ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS` |
| `ABDM_GATEWAY_OPENID_JWKS_URI` | `INTEGRATION_HUB_ABDM_GATEWAY_OPENID_JWKS_URI` |
| `ABDM_GATEWAY_JWT_ISSUER` / `AUDIENCE` | `INTEGRATION_HUB_ABDM_GATEWAY_JWT_*` |
| `ABDM_CM_CONSENT_VERIFY_CERT_PEM` | `INTEGRATION_HUB_ABDM_CM_CONSENT_VERIFY_CERT_PEM` |
| `ABDM_M3_AWAITING_PUSH_HOURS` | `INTEGRATION_HUB_ABDM_M3_AWAITING_PUSH_HOURS` |
| `ABDM_M2_MOCK_PLATFORM` | `INTEGRATION_HUB_ABDM_M2_MOCK_PLATFORM` |
| `ABDM_MOCK_ABHA_ADDRESS` | `INTEGRATION_HUB_ABDM_MOCK_ABHA_ADDRESS` |

Service should accept **old names as aliases** during transition (same pattern as `normalizeAbdmEnvAliases()` today).

### 7.3 Test-only (unchanged names)

- `ABDM_SANDBOX_TEST_*`, `ABDM_RUN_LIVE_NHA_SANDBOX`
- `ABDM_SANDBOX_TEST_TENANT_ID` (used by integration tests alongside `ABDM_DEV_TENANT_ID`)

### 7.4 Deployment-level vars (in codebase today — rename with `INTEGRATION_HUB_*` prefix)

Issue #143 lists the main P1 renames in §7.2. The following are also read from env in `modules/abdm-adapter` and stay **deployment-level** (not in `tenant_integration_profiles`). Rename in **Code PR 3** via `normalizeIntegrationHubEnvAliases()`:

| Current env | New (Code PR 3) | Used for |
|-------------|-----------------|----------|
| `ABDM_M3_PUSH_CHECKSUM_MODE` | `INTEGRATION_HUB_ABDM_M3_PUSH_CHECKSUM_MODE` | HIP push checksum (`literal` / `sha256` / `md5`) |
| `ABDM_M3_DATA_PUSH_MINIMAL_HEADERS` | `INTEGRATION_HUB_ABDM_M3_DATA_PUSH_MINIMAL_HEADERS` | External data-push POST headers |
| `ABDM_M3_KEYPAIR_TTL_HOURS` | `INTEGRATION_HUB_ABDM_M3_KEYPAIR_TTL_HOURS` | M3 keypair session TTL |
| `ABDM_M3_PUSH_TIMEOUT_MS` | `INTEGRATION_HUB_ABDM_M3_PUSH_TIMEOUT_MS` | HIP push HTTP timeout |
| `ABDM_M3_PUSH_TOTAL_TIMEOUT_MS` | `INTEGRATION_HUB_ABDM_M3_PUSH_TOTAL_TIMEOUT_MS` | HIP push total timeout |
| `ABDM_LINK_TOKEN_POLL_INTERVAL_MS` | `INTEGRATION_HUB_ABDM_LINK_TOKEN_POLL_INTERVAL_MS` | Link token poll interval |
| `ABDM_LINK_TOKEN_POLL_MAX_INTERVAL_MS` | `INTEGRATION_HUB_ABDM_LINK_TOKEN_POLL_MAX_INTERVAL_MS` | Link token poll max interval |
| `ABDM_MOCK_PATIENT_ID` | `INTEGRATION_HUB_ABDM_MOCK_PATIENT_ID` | M2 mock platform patient id |
| `ABDM_DEV_INBOUND_SIMULATION` | `INTEGRATION_HUB_ABDM_DEV_INBOUND_SIMULATION` | Skip outbound NHA acks (local only) |

**Unchanged names** (not ABDM-prefixed): `EMPI_BASE_URL`, `RECORD_FOUNDATION_BASE_URL`, `ENABLE_AUTH`, `JWKS_URL`, `NODE_ENV`.

`callback_base_url` and M3 loopback URL logic that today read `ABDM_ADAPTER_PUBLIC_BASE_URL` / `ABDM_ADAPTER_SVC_PORT` should read from **profile** (`callback_base_url`) where the URL is tenant-specific (ngrok per hospital).

### 7.5 `normalizeIntegrationHubEnvAliases()` reference (Code PR 3)

**Code PR 1** does not implement alias normalization. **Code PR 3** adds `normalizeIntegrationHubEnvAliases()` in `integration-hub-svc` (extends today's `normalizeAbdmEnvAliases()` in `abdm-adapter-svc`): for each row below, if the **new** name is unset and the **old** name is set, copy old → new.

**§7.2 renames** — see table in §7.2 (all `ABDM_*` → `INTEGRATION_HUB_*` / `INTEGRATION_HUB_ABDM_*` as listed there).

**§7.4 renames** — see table in §7.4 above.

**Postman / informal aliases** (today in `load-env.ts`; carry forward in Code PR 3):

| Informal key | Resolves to (old) | After rename, also accept |
|--------------|-------------------|---------------------------|
| `clientId` | `ABDM_SANDBOX_CLIENT_ID` | `INTEGRATION_HUB_*` client id var from profile seed docs |
| `clientSecret` | `ABDM_SANDBOX_CLIENT_SECRET` | same pattern |

**Test-only (§7.3):** no rename — `ABDM_SANDBOX_TEST_*`, `ABDM_RUN_LIVE_NHA_SANDBOX`, `ABDM_SANDBOX_TEST_TENANT_ID` keep current names.

---

## 8. Changes outside the module

| Location | Change |
|----------|--------|
| `modules/configurator/src/schema/tables.ts` | `tenant_integration_profiles` |
| `modules/configurator/src/index.ts` | export repo + types |
| `modules/configurator/src/data-access/` | `DrizzleTenantIntegrationProfilesRepo` |
| `tsconfig.base.json` | `@hims/integration-hub` path |
| `tools/dockerfile-for-svc.sh` | `integration-hub-svc` |
| `Makefile` | replace `abdm-adapter-svc` |
| `services/web/.env.example` | comment update |
| `infra/devops-handoff.md` | service table |
| `specs/openapi/abdm-adapter.v1.yaml` | rename → `integration-hub.v1.yaml` |
| `pnpm-lock.yaml` | `pnpm install` |

---

## 9. Migration plan (parts A–D)

### Part A — Foundation (additive) — **Code PR 1**

1. Add `tenant_integration_profiles` (Drizzle, migration with partial unique on `hip_id`, port, repo, export).
2. **Configurator-svc REST CRUD** for profiles + **seed script** from legacy `.env`.
3. Scaffold `modules/integration-hub/` + `integrations/abdm/`.
4. Copy ABDM sources — no behaviour change.
5. Add `integration-context.ts`, `per-tenant-secrets.ts`, `integration-profile-repo.ts`, `build-abdm-deps.ts` (factory; may stub until PR 2).

### Part B — Multi-tenant refactor — **Code PR 2**

5. Refactor rest handlers → `request.integrationCtx.deps` (`m0`, `m1`, `m2` platform + callbacks, `m3` platform + callbacks).
6. Refactor `router.ts` — stateless plugin registration.
7. Refactor data-access: `gateway-client.http.ts` (`xCmId` per-call), `sms-client.ts` (per-tenant factory), secrets primary path.
8. Refactor `resolve-callback-tenant.ts` → DB by `hip_id`.

### Part C — Schema + service — **Code PR 3**

9. Rewrite 8 table defs → `integration_hub` schema.
10. Fix import paths (`../schema` → `../../schema` under `integrations/abdm/`).
11. Rename constants: `ABDM_ADAPTER_SCHEMA_NAME` → `INTEGRATION_HUB_SCHEMA_NAME`, etc.
12. Wire `integrationContextResolver` in `main.ts`; extract janitor; rename P1 env vars; slim `load-env.ts`.
13. Migrations, OpenAPI rename, Makefile/docker/devops.

### Part D — Cleanup — **Code PR 4**

14. Delete `modules/abdm-adapter/` + `services/abdm-adapter-svc/`.
15. `pnpm install`.
16. Smoke test: `npx nx run integration-hub-svc:serve` + existing ABDM sandbox/M3 mock flows.

---

## 10. Effort estimate

| Part | Effort | Files |
|------|--------|-------|
| A. Foundation | ~2 days | 15–20 new |
| B. Multi-tenant refactor | ~4 days | 30–40 modified |
| C. Schema + service | ~2 days | 10–15 modified |
| D. Cleanup + smoke | ~1 day | 5 deleted + test |
| **Total** | **~9 days** | |

---

## 11. Open design items (resolve in Part B)

1. **`gateway-client.http.ts`** — per-call `xCmId` vs tenant-aware secrets client.
2. **`GatewayClient` token caching** — **disable** process-wide cache in Code PR 2; keyed `(tenant, environment)` deferred for prod.
3. **Callback resolver fast path** — direct DB query vs in-memory cache of `hip_id → tenant`.
4. **Dev tenant bootstrap** — whether `ABDM_DEV_TENANT_ID` remains when profile seeding is incomplete.

---

## 12. References

- [Issue #143](https://github.com/IQ-Line/HospitalSaarthi/issues/143) — implementation tracking
- [Issue #143 coverage matrix](./02-issue-143-coverage-matrix.md) — body + comments vs docs
- [Safe migration and cutover](./03-safe-migration-and-cutover.md) — PR sequence, callbacks, rollback
- [Implementation guide](../../guides/integration-hub-phase-1a-implementation.md) — E2E smoke + seed SQL
- [ADR-0030](../../adr/0030-abdm-adapter-prototype-phase.md)
- [ADR-0011](../../adr/0011-integration-hub-split.md)
- [ABDM adapter overview](../abdm-adapter/01-overview.md) — current Phase 0 behaviour
- [M3 PHR push reconciliation](../abdm-adapter/12-phr-push-reconciliation.md) — crypto unchanged in Phase 1a

### Historical context (comments on #143 — not Phase 1a scope)

These were pasted into the issue for background only:

- Full [04-orchestration-phase-1-http-first.md](../integration-platform/04-orchestration-phase-1-http-first.md) (`flows/`, `activities/`, timer worker)
- 13-table [schema-reference.json](../integration-platform/schema-reference.json)
- Broad transition DEVNOTE (consent merge, `atomic-transition`, 3–4 week full hub estimate)

Do not implement those unless explicitly scheduled in a follow-up issue.

# Draft: Integration Hub — Phase 1a

**Status:** Draft — review before posting
**Target:** GitHub issue in `IQ-Line/HospitalSaarthi`
**Assignee:** @kamal-iqline
**Labels:** `integration-hub`, `multi-tenant`, `refactor`

---

## Title

```
[integration-hub] Phase 1a: Restructure abdm-adapter into integration-hub with per-tenant credential resolution
```

## Body

### Context

The current `modules/abdm-adapter/` + `services/abdm-adapter-svc/` is a Phase 0 prototype
(per ADR-0030). It operates as a single-tenant service — all ABDM gateway credentials
(HIP ID, HIU ID, CM ID, OAuth2 client ID/secret, SMS config) are read from environment
variables at boot and shared across every tenant.

The Integration Hub architecture has settled, and we need two things from Phase 1a:

1. **Directory shape** — establish `modules/integration-hub/` as the integration platform
   module with ABDM as a sub-integration under `integrations/abdm/`.
2. **Multi-tenant credentials** — tenant-specific ABDM gateway credentials stored in a
   new `configurator.tenant_integration_profiles` table, resolved per-request instead
   of read from env vars at boot.

All generic shared infra (transition audit, timer worker, outbound logging, etc.) is
deferred until a second integration justifies it.

### What we're building

```
modules/integration-hub/          ← @hims/integration-hub
  src/
    index.ts                      ← public API
    router.ts                     ← fastify-plugin wrapping ABDM routes
    schema/
      tables.ts                   ← 8 ABDM tables, same columns, in `integration_hub` schema
    integrations/
      abdm/                       ← copied from modules/abdm-adapter/src/
        use-cases/                ← unchanged signatures
        rest-handlers/            ← REFACTORED — read deps from request.integrationCtx
        data-access/              ← REFACTORED — gateway, sms, secrets become per-tenant-aware
        domain/                   ← unchanged
        events/                   ← unchanged
        lib/                      ← unchanged
    lib/
      integration-context.ts      ← NEW per-request deps bag
      per-tenant-secrets.ts       ← NEW SecretsClient backed by DB, not env
    workers/
      janitor.ts                  ← MOVED from main.ts inline

services/integration-hub-svc/     ← @hims/integration-hub-svc
  src/
    main.ts                       ← REFACTORED — no P0 env reads, wires middleware
    load-env.ts                   ← reduced — only deployment-level vars
    resolve-database-url.ts
    http-errors.ts
  scripts/
    migrate.mjs                   ← points to integration-hub migrations
  project.json
  package.json
  tsconfig.json

modules/configurator/             ← changeset
  src/
    schema/
      tables.ts                   ← ADD tenant_integration_profiles table
    integrations-profiles/        ← NEW: port + CRUD use-cases + handlers
      integration-profiles.port.ts
      rest-handlers.ts
```

### Multi-tenant credential model

#### New table: `configurator.tenant_integration_profiles`

Stores the per-tenant ABDM gateway credentials that are currently env vars:

| Column | Type | Maps from current env var |
|---|---|---|
| `id` | `uuid PK` | — |
| `iq_tenant_id` | `uuid NOT NULL FK → configurator.tenants` | — |
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
| `sms_config` | `jsonb` | All `ABDM_SMS_*` provider-specific configs |
| `gateway_environment` | `text DEFAULT 'sandbox'` | implicit from ABDM_GATEWAY_BASE_URL |
| `created_at` / `updated_at` | `timestamptz` | — |

Unique constraint: `(iq_tenant_id, integration_kind)`.

Secrets note: client_id and client_secret are stored plaintext for Phase 1a
(no production deployment). Encryption/vault integration is Phase 1b+.

#### How it works at runtime

A new Fastify middleware (`integrationContextResolver`) runs on every request:

1. Reads `iqTenantId` from the request (existing `tenantPlugin` handles this)
2. Loads the tenant's active ABDM integration profile from
   `configurator.tenant_integration_profiles`
3. Constructs a per-request deps bag with tenant-specific values:
   - `xHipId`, `xHiuId`, `xCmId` → from profile
   - `defaultSmsPhoneNo`, `hipDisplayName` → from profile
   - `secrets` → `PerTenantSecretsClient` instance that resolves from the profile row
   - `sms` → `SmsClient` configured from profile's `sms_provider` + `sms_config`
4. Attaches to `request.integrationCtx`

Rest handlers read from `request.integrationCtx.deps` instead of a closure-captured
`adapterDeps` object. Use-cases themselves don't change — they still receive `(input, deps)`.

Callback tenant resolution (`resolve-callback-tenant.ts`) switches from env var
`ABDM_HIP_TENANT_MAP` to a DB query on `tenant_integration_profiles` keyed by HIP ID.

### What stays identical

- All use-case signatures — still `(input, deps)` pure functions
- Domain types, value objects, entity lifecycle
- Event types, publishers, and consumers
- Drizzle repository classes for the 8 existing tables
- Fidelius crypto (algorithm is uniform — not per-tenant)
- Payload encryptor (token encryption key stays as env var for now)
- All route paths and HTTP method signatures
- Janitor logic (moved to `workers/janitor.ts`)
- Consent artefact signature verification
- Gateway JWS verification config

### What changes structurally

| Area | Current | After |
|---|---|---|
| Credential source | `process.env` at boot | `configurator.tenant_integration_profiles` per-request |
| Dependency injection | Singleton `AbdmAdapterDeps` bag | Per-request deps from middleware |
| Rest handler deps | Closure-captured at plugin register | `request.integrationCtx.deps` |
| Callback tenant resolution | `ABDM_HIP_TENANT_MAP` env var | DB query on profiles table by HIP ID |
| `SecretsClient` | Reads `env:VAR` from `process.env` | Reads from profile row (still supports `env:` fallback) |
| `GatewayClient.xCmId` | Constructor-injected | Per-call or resolved via per-tenant deps |
| `SmsClient` | Singleton from env vars | Per-tenant from profile config |
| Service bootstrap | Reads all 46 env vars | Reads only deployment-level ~30 vars |
| `xHipId`, `xHiuId` | Strings from env | Strings from profile per-request |
| `ABDM_ADAPTER_SCHEMA_NAME` | `"abdm_adapter"` | `"integration_hub"` |

### What's deferred to Phase 1b+ (unchanged from earlier plan)

| Component | When |
|---|---|
| `integrations` registry table + CRUD | 2nd integration arrives |
| `integration_workflow_transitions` (audit) | Workflow debugging needed |
| `integration_timers` + timer worker | Durable scheduling justified |
| `integration_inbound/outbound_messages` | Cross-integration tracing needed |
| `atomic-transition.ts` helper | State transitions need write ordering |
| Idempotency middleware | Callback duplication observed in prod |
| Consent merge (3→2) | Schema cleanup scheduled |
| `link_otps` fold into session context | Table count reduction prioritized |
| Secret encryption at rest | Production deployment |
| Vault integration | Production deployment |

### Env var changes

**P0 — removed from env, live in DB profile:**
- `ABDM_X_HIP_ID`, `ABDM_X_HIU_ID`, `ABDM_X_CM_ID`
- `ABDM_SANDBOX_CLIENT_ID`, `ABDM_SANDBOX_CLIENT_SECRET`
- `ABDM_DEFAULT_SMS_PHONE`, `ABDM_HIP_DISPLAY_NAME`
- `ABDM_ADAPTER_PUBLIC_BASE_URL`
- `ABDM_HIP_TENANT_MAP`
- `ABDM_DEV_TENANT_ID`
- `ABDM_SMS_PROVIDER` + all `ABDM_SMS_*` provider-specific vars

**P1 — renamed (deployment-level config):**

| Old | New |
|---|---|
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
| `ABDM_OTP_RATE_LIMIT_MAX` | `INTEGRATION_HUB_ABDM_OTP_RATE_LIMIT_MAX` |
| `ABDM_OTP_RATE_LIMIT_WINDOW_SEC` | `INTEGRATION_HUB_ABDM_OTP_RATE_LIMIT_WINDOW_SEC` |
| `ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS` | `INTEGRATION_HUB_ABDM_LINK_TOKEN_ACQUIRE_TIMEOUT_MS` |
| `ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS` | `INTEGRATION_HUB_ABDM_M3_CONSENT_REQUEST_EXPIRY_HOURS` |
| `ABDM_GATEWAY_OPENID_JWKS_URI` | `INTEGRATION_HUB_ABDM_GATEWAY_OPENID_JWKS_URI` |
| `ABDM_GATEWAY_JWT_ISSUER` / `AUDIENCE` | `INTEGRATION_HUB_ABDM_GATEWAY_JWT_*` |
| `ABDM_CM_CONSENT_VERIFY_CERT_PEM` | `INTEGRATION_HUB_ABDM_CM_CONSENT_VERIFY_CERT_PEM` |
| `ABDM_M3_AWAITING_PUSH_HOURS` | `INTEGRATION_HUB_ABDM_M3_AWAITING_PUSH_HOURS` |
| `ABDM_M2_MOCK_PLATFORM` | `INTEGRATION_HUB_ABDM_M2_MOCK_PLATFORM` |
| `ABDM_MOCK_ABHA_ADDRESS` | `INTEGRATION_HUB_ABDM_MOCK_ABHA_ADDRESS` |

**P2 — test-only, stay as-is:**
- `ABDM_SANDBOX_TEST_*` vars, `ABDM_RUN_LIVE_NHA_SANDBOX`

### Changes outside the module

| File | Change |
|---|---|
| `modules/configurator/src/schema/tables.ts` | Add `tenant_integration_profiles` Drizzle table def |
| `modules/configurator/src/index.ts` | Export new repo + types |
| `modules/configurator/src/data-access/` | Add `DrizzleTenantIntegrationProfilesRepo` |
| `tsconfig.base.json` | Add `@hims/integration-hub` path entry (verify Nx resolution) |
| `tools/dockerfile-for-svc.sh` | Add `integration-hub-svc` mapping |
| `Makefile` | Replace `abdm-adapter-svc` references |
| `services/web/.env.example` | Update comment referencing `abdm-adapter-svc` |
| `infra/devops-handoff.md` | Update service table entry |
| `specs/openapi/abdm-adapter.v1.yaml` | Rename to `integration-hub.v1.yaml`, update info |
| `pnpm-lock.yaml` | Regenerated by `pnpm install` |
| `infra/docker/node-svc.Dockerfile` | **No change** — already generic |

### Migration steps (in order)

#### Part A: Foundation (steps 1–4 — additive, no existing code touched)

1. **Add `tenant_integration_profiles` table** to configurator schema
   — Drizzle definition, migration, port interface, Drizzle repo, exported from index

2. **Scaffold** `modules/integration-hub/` with `integrations/abdm/` substructure
   — `package.json`, `project.json`, `tsconfig.json`

3. **Copy ABDM source files** into `integrations/abdm/` — no behavioral changes yet

4. **Write shared infra:**
   - `lib/integration-context.ts` — per-request deps bag type + resolver
   - `lib/per-tenant-secrets.ts` — `SecretsClient` implementation backed by profile DB
   - `lib/integration-profile-repo.ts` — port + Drizzle impl reading configurator schema

#### Part B: Multi-tenant refactor (steps 5–8 — changes existing handler patterns)

5. **Refactor rest handlers** — all handlers read deps from `request.integrationCtx.deps`
   instead of the closure-captured bag. Affects:
   - `rest-handlers/m1/m1-routes.ts`
   - `rest-handlers/m2/m2-platform-routes.ts`
   - `rest-handlers/m2/m2-callback-routes.ts`
   - `rest-handlers/m3/m3-platform-routes.ts`
   - `rest-handlers/m3/m3-callback-routes.ts`
   - `rest-handlers/m0/m0-routes.ts`

6. **Refactor `router.ts`** — remove `AbdmAdapterDeps` from plugin registration;
   plug-in becomes stateless (deps come from request context)

7. **Refactor data-access layer:**
   - `gateway-client.http.ts` — make `xCmId` per-call (add to `post()`/`get()` input or
     delegate to per-tenant secrets)
   - `sms-client.ts` — keep interface, but remove `createSmsClientFromEnv()`; replace with
     per-tenant factory
   - `env-secrets.client.ts` — keep as fallback resolver; replace with
     `per-tenant-secrets.ts` for the primary path

8. **Refactor callback tenant resolution:**
   - `lib/resolve-callback-tenant.ts` — switch from `ABDM_HIP_TENANT_MAP` env var to
     DB query on `tenant_integration_profiles` by HIP ID

#### Part C: Schema + service (steps 9–13)

9. **Rewrite 8 table definitions** — same columns, move from `abdm_adapter` schema to
   `integration_hub` schema

10. **Update internal imports** — file path depth changes from `../schema` to
    `../../schema` for files in `integrations/abdm/`

11. **Update exported constants** — `ABDM_ADAPTER_MODULE_KEY` → `ABDM_MODULE_KEY`,
    `ABDM_ADAPTER_SCHEMA_NAME` → `INTEGRATION_HUB_SCHEMA_NAME`

12. **Write middleware + wire in service bootstrap** — `integrationContextResolver`:
    - onRequest hook loads profile, constructs deps, sets `request.integrationCtx`
    - Janitor extract to `workers/janitor.ts`
    - Remove all P0 env var reads
    - Rename P1 env vars with `INTEGRATION_HUB_*` prefix
    - `load-env.ts` simplified to deployment-level vars only

13. **Scaffold migration scripts + OpenAPI spec + deployment files**
    - Migration scripts point to `integration_hub` schema
    - OpenAPI spec renamed to `integration-hub.v1.yaml`
    - Makefile, dockerfile mapping, devops-handoff.md, .env.example updated

#### Part D: Cleanup (steps 14–16)

14. **Delete** `modules/abdm-adapter/` + `services/abdm-adapter-svc/`

15. **`pnpm install`** — sync lockfile

16. **Smoke test** — `npx nx run integration-hub-svc:serve` + sandbox test

### Effort estimate

| Part | Effort | Files changed |
|---|---|---|
| A. Foundation (tables + scaffold + shared infra) | ~2 days | 15–20 new files |
| B. Multi-tenant refactor (handlers + data-access + callbacks) | ~4 days | 30–40 modified files |
| C. Schema + service (tables rewrite + bootstrap + wiring) | ~2 days | 10–15 modified files |
| D. Cleanup + smoke test | ~1 day | 5 deleted + 1 day test |
| **Total** | **~9 days** | |

### Open items

- **`gateway-client.http.ts`** — exact approach for per-call `xCmId` vs.
  tenant-aware secrets client. Needs design decision during Part B.
- **`FideliusEncryptor`** — currently uniform, but in production each tenant might need
  separate key material. Deferred to Phase 1b+.
- **`GatewayClient` token caching** — currently caches bearer tokens in-memory per
  process. In multi-tenant, cache should be scoped per (tenant, environment).
  Minimum viable: disable cache for now (acceptable for sandbox).
- **`ABDM_HIP_TENANT_MAP` replacement** — the DB table provides the reverse lookup,
  but the callback resolver needs a fast path (direct query or in-memory cache).

### References

- [Architecture: HTTP-first orchestration (chosen design)](docs/architecture/lld/integration-platform/04-orchestration-phase-1-http-first.md)
- [Phase 0 prototype justification (ADR-0030)](docs/architecture/adr/0030-abdm-adapter-prototype-phase.md)
- [Full transition DEVNOTE](docs/architecture/lld/integration-platform/DEVNOTE-2026-05-28-abdm-to-integration-hub-transition.md)
- [Schema reference](docs/architecture/lld/integration-platform/schema-reference.json)
- [Multi-tenant analysis — all env vars classified](docs/architecture/lld/integration-platform/DEVNOTE-2026-05-28-abdm-to-integration-hub-transition.md#9-complete-env-var-inventory)

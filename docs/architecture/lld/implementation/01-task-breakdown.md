# Implementation Task Breakdown

> **Status:** Draft v0.1
>
> **Purpose:** Break the documented architecture into concrete work streams for implementation. Organized by phase, with dependency relationships and parallelizability clearly marked. Dev-count agnostic — assign based on team availability.
>
> **Cross-references:** [Monorepo Setup LLD](../repo-structure/01-monorepo-setup.md) | [Frontend Structure LLD](../frontend/01-frontend-structure.md) | [Module Build Order](../../analysis/02-module-build-order.md) | [Module Shape Template](../../hld/03-module-shape-template.md)

---

## How to read this document

- **Streams** are independent tracks that can run in parallel.
- **Tasks** within a stream are sequential (top to bottom) unless marked `[parallel]`.
- **Blocked by** tells you which task(s) from other streams must finish first.
- **Deliverable** is the concrete output — a working package, a passing CI check, a deployable service.
- Tasks marked `[gate]` are prerequisites that multiple downstream tasks depend on — prioritize them.

---

## Phase 0: Monorepo Foundation

Everything in Phase 0 must be done before any module code. The goal: a developer can scaffold a module, write a use-case, run tests, and see CI pass — without any module-specific code existing yet.

### Stream A: Repo Scaffold [gate]

Everything else depends on this stream completing first. Keep it tight — 1-2 days maximum.

| # | Task | Deliverable | Notes |
|---|------|-------------|-------|
| A1 | Initialize Nx workspace with pnpm | `nx.json`, `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json` | `npx create-nx-workspace@latest` with pnpm preset, TypeScript |
| A2 | Create directory skeleton | Empty `specs/`, `packages/`, `modules/`, `services/`, `infra/`, `tools/`, `tests/load/`, `docs/` | Match [LLD §1](../repo-structure/01-monorepo-setup.md) layout exactly |
| A3 | Shared configs — ESLint, tsconfig, Prettier | `packages/eslint-config/`, `packages/tsconfig/`, root `.prettierrc` | ESLint: sonarjs + security plugins. tsconfig: strict, paths aliases |
| A4 | `.env.example` with all Phase 0 variables | `.env.example` at root | DATABASE_URL, PGBOUNCER_URL, CERBOS_URL, JWKS_URL, BETTER_AUTH_SECRET, EVENT_BUS_TYPE, OTEL_EXPORTER_URL |
| A5 | `Makefile` with core targets | `make setup`, `make dev`, `make infra`, `make help` | Other targets (`db-reset`, `ci-local`, etc.) added as streams deliver their pieces |
| A6 | `.github/workflows/ci.yml` skeleton | CI runs lint on push (placeholder) | Full pipeline built in Stream F; this just proves Actions work |

**Exit criteria:** `pnpm install` succeeds, `nx graph` shows the workspace, `make help` lists targets.

---

After Stream A completes, the following streams can run **in parallel**:

### Stream B: Infrastructure (Docker + DB + Cerbos)

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| B1 | `docker-compose.yml` — PostgreSQL+Citus, PgBouncer, Cerbos PDP | A2 | `infra/docker/docker-compose.yml` | Health checks on all services. Citus single-node for dev. |
| B2 | Citus init script | B1 | `infra/db/citus-init.sql` | `CREATE EXTENSION citus`, `pg_stat_statements`. Create schemas: `user_management`, `configurator`, `empi`, `master_data`. |
| B3 | PgBouncer config | B1 | `infra/db/pgbouncer.ini` | Transaction mode pooling. Points at Citus. |
| B4 | Cerbos PDP configuration | B1 | `infra/cerbos/cerbos.yaml` | Disk policy store pointing at `infra/cerbos/policies/`. Schema enforcement enabled. |
| B5 | Seed Cerbos policies — platform baseline | B4 | `infra/cerbos/policies/` with resource policies for `user`, `tenant`, `patient`, `config` | Enough for Phase 0 modules. Test fixtures in `infra/cerbos/tests/`. |
| B6 | `make infra`, `make infra-down`, `make db-reset` targets | B1 | Makefile targets | `make infra` = `docker-compose up -d`, wait healthy. `make db-reset` = drop schemas, re-run init, migrate. |

**Exit criteria:** `make infra` brings up Citus+PgBouncer+Cerbos, all healthy. `cerbos test` passes against seed policies.

### Stream C: SDK Packages

SDK packages have internal dependencies. Build order within the stream matters.

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| C1 | `ts-sdk-db` — Drizzle base config | A3 | Audit columns (`tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`), `distributedTable()` helper, `withTenant()` query wrapper | Foundation for all data-access layers |
| C2 | `ts-sdk-tenant` — AsyncLocalStorage tenant middleware | A3 | `tenantPlugin()` (Fastify plugin), `getTenantId()` accessor | Reads `iq_tenant_id` from JWT claims, stores in AsyncLocalStorage |
| C3 | `ts-sdk-identity` — JWT verification | A3 | `identityPlugin()` (Fastify plugin), `verifyToken()`, JWKS cache with TTL | Verifies JWTs against JWKS endpoint. Must work with better-auth's JWKS. |
| C4 | `ts-sdk-authz` — Cerbos PEP middleware | C3 | `pepPlugin()` (Fastify plugin), `checkResources()`, `planResources()`, request-scoped decision cache | Depends on identity (needs `Principal` from JWT). Uses `@cerbos/grpc`. |
| C5 | `ts-sdk-events` — EventBus interface + InProcessEventBus | A3 | `createEventBus()`, `EventBus` interface, `InProcessEventBus`, envelope validation, `DomainEvent` types | [ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md). Promise.allSettled for consumer isolation. |
| C6 | `ts-sdk-testing` — test helpers | C1, C5 | Mock event bus (in-memory), mock Cerbos, integration DB setup (per-test schema), test principal factory, tenant fixtures | Every module's test suite depends on this |

**Parallelizable within stream:** C1, C2, C3, C5 can all start simultaneously (they only depend on A3). C4 waits for C3. C6 waits for C1 and C5.

**Exit criteria:** Each package has unit tests passing, exports typed API, and has a `README.md` with usage example.

### Stream D: Frontend Shell

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| D1 | Vite + React 19 + TanStack Router scaffold | A3 | `services/web/` with Vite config, TanStack Router Vite plugin, `__root.tsx`, dev server runs | File-based routing from day one |
| D2 | Tailwind v4 + Pulse integration | D1 | `styles/index.css` with Tailwind + Pulse CSS variables (OKLCH) | Install `@pulse/ui`, verify components render |
| D3 | Global Zustand stores — auth, tenant, ui-prefs | D1 | `stores/auth.store.ts`, `stores/tenant.store.ts`, `stores/ui-prefs.store.ts` | `devtools` middleware on all. `persist` on ui-prefs only. |
| D4 | Permissions store + Cerbos client | D3 | `stores/permissions.store.ts`, `lib/cerbos-client.ts`, `lib/permissions.ts` helpers | `@cerbos/http` client, `CerbosProvider` in providers.tsx. `hasModuleAccess()`, `hasFeaturePermission()` helpers. |
| D5 | API client + React Query setup | D1 | `lib/api-client.ts`, `lib/query-client.ts`, `QueryClientProvider` in providers | API client reads token from `useAuthStore.getState()` (outside-React access) |
| D6 | Auth layout route + login page skeleton | D3, D5 | `routes/_authenticated.tsx` with `beforeLoad` auth guard, `routes/login.tsx` | Redirects to login if no session. Loads permission map on auth. |
| D7 | App shell with permission-gated navigation | D4, D6 | `routes/_authenticated.tsx` renders AppShell (from @pulse/layouts), sidebar nav conditionally rendered from permission map | Modules shown/hidden based on `hasModuleAccess()` |

**Exit criteria:** `make dev-web` starts the frontend. Login flow skeleton works (mocked auth). Navigation renders based on permission map. TanStack Router DevTools visible in dev.

### Stream E: Spec-First Pipeline

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| E1 | `specs/` directory structure + authoring rules | A2 | `specs/openapi/`, `specs/events/`, `specs/README.md` with versioning policy, `_envelope.schema.json` | Event envelope follows [LLD §3.2](../repo-structure/01-monorepo-setup.md) format |
| E2 | OpenAPI client generation pipeline | E1 | `packages/openapi-clients/` with generation script, `tools/scripts/generate-clients.ts` | Pick generator: `openapi-typescript` + `openapi-fetch` (or `orval`). Run from Nx target. |
| E3 | Spec validation script | E2 | `tools/scripts/validate-specs.ts`, Nx target `validate-spec` | Ensures module routes cover their OpenAPI spec — no missing endpoints, no undocumented endpoints |
| E4 | Write skeleton OpenAPI specs for Phase 0 modules | E1 | `specs/openapi/user-management.v1.yaml`, `configurator.v1.yaml`, `empi.v1.yaml`, `master-data.v1.yaml` | Skeleton = paths + schemas from existing LLD docs. Filled out fully when module work starts. |
| E5 | Write skeleton event schemas for Phase 0 modules | E1 | `specs/events/user.events.yaml`, `config.events.yaml`, `patient.events.yaml`, `master-data.events.yaml` | Define event types and payload schemas. Rich payloads per [build order §7](../../analysis/02-module-build-order.md). |

**Exit criteria:** `nx run openapi-clients:generate` produces typed clients. `nx run openapi-clients:validate-spec` catches missing endpoints.

### Stream F: CI Pipeline

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| F1 | Full `ci.yml` — lint, typecheck, test | A6, C1 (need at least one testable package) | `.github/workflows/ci.yml` stages 1-6 from [LLD §7.1](../repo-structure/01-monorepo-setup.md) | `nx affected` for all stages. Citus + Cerbos in CI via docker services. |
| F2 | Integration test stage | F1, B1 | CI stages 7-8: integration tests + Cerbos policy tests | Real DB in CI. `cerbos test` against fixtures. |
| F3 | E2E test stage (skeleton) | F2 | CI stage 9: Playwright placeholder | Actual E2E tests come when frontend features exist |
| F4 | AI code review stage | F3 | CI stage 10: architecture + code quality review agents | After E2E so agents have test results as context |
| F5 | Load test workflow | B1 | `.github/workflows/load-test.yml` | Scheduled nightly + manual dispatch. k6 + Prometheus remote write to LGTM. |

**Exit criteria:** A PR touching any package/module triggers affected-only lint + typecheck + test. Cerbos policy changes trigger policy tests. Nightly load test workflow exists (even if no scenarios yet).

### Stream G: Nx Module Generator

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| G1 | Module generator — TypeScript | C1, E1 | `tools/generators/module/` scaffolds full module structure per [LLD §8](../repo-structure/01-monorepo-setup.md) | Outputs: `modules/<name>/`, `services/<name>-svc/`, `specs/openapi/<name>.v1.yaml`, `specs/events/<name>.events.yaml` |
| G2 | Module generator — Python (if needed for Phase 0) | G1 | Generator `--language=python` flag | `pyproject.toml` (uv), `project.json` with ruff/pytest targets, FastAPI structure |

**Exit criteria:** `nx generate @hims/tools:module test-module` produces a module that passes lint and has a running (empty) Fastify server.

---

### Phase 0 dependency graph

```
Stream A (repo scaffold) ─────────────────────────────── [GATE: everything starts here]
    │
    ├──▶ Stream B (infra)     ──▶ [B6: make targets]
    │
    ├──▶ Stream C (SDKs)      ──▶ [C6: testing helpers]
    │        │
    │        └──▶ Stream G (generator) ─── requires C1 + E1
    │
    ├──▶ Stream D (frontend)  ──▶ [D7: permission-gated shell]
    │
    ├──▶ Stream E (specs)     ──▶ [E5: event schemas]
    │
    └──▶ Stream F (CI)        ──▶ [F4: AI review] ─── requires F1→F2→F3→F4 sequential
```

**Maximum parallelism: 5 streams** (B, C, D, E, F) after Stream A completes. Stream G starts when C1 + E1 are done.

**Phase 0 exit criteria:** Run the Nx generator to scaffold a test module. The generated module's service wrapper starts (Fastify), connects to Citus (via PgBouncer), registers Cerbos + identity + tenant plugins, publishes a test event via InProcessEventBus, and the frontend shell shows a placeholder route for it gated by permissions. CI passes on the PR that adds it. Then delete the test module.

---

## Phase 1A: User Management Module

Can begin as soon as Streams A, B (B1-B3), C (C1-C5), and E (E1) are minimally functional. Does not require the full Phase 0 exit criteria — the module development itself exercises and completes the platform foundation.

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| 1A.1 | Finalize OpenAPI spec | E4 (skeleton exists) | `specs/openapi/user-management.v1.yaml` — complete paths and schemas | Based on [User Management LLD](../user-management/01-schema-design.md) |
| 1A.2 | Finalize event schemas | E5 (skeleton exists) | `specs/events/user.events.yaml` — `user.created`, `user.updated`, `user.deactivated`, `role.assigned`, etc. | Rich payloads (name, department, roles, specialty) |
| 1A.3 | Drizzle schema + migrations | C1, B2 | `modules/user-management/src/schema/tables.ts` + initial migration | Three-layer model from [User Management LLD](../user-management/01-schema-design.md). Citus distribution on `tenant_id`. |
| 1A.4 | Domain types + port interfaces | 1A.1 | `domain/`, `ports.ts` | Types from LLD. Ports: `UserRepo`, `RoleRepo`, `CredentialRepo`, `IdentityProviderAdapter` |
| 1A.5 | Data-access layer (Drizzle repos) | 1A.3, 1A.4 | `data-access/` — all repo implementations | Integration tests with real Citus |
| 1A.6 | Use-cases | 1A.4 | `use-cases/` — `create-user`, `authenticate-local`, `assign-role`, `federate-login`, `deactivate-user`, etc. | Unit tests with mocked ports |
| 1A.7 | better-auth integration | C3, 1A.5 | better-auth provider config, session management, JWKS endpoint, token issuance | This is the auth backbone for the entire platform. Produces the JWTs that `ts-sdk-identity` verifies. |
| 1A.8 | HTTP + REST handlers | 1A.6, 1A.7 | `http-handlers/`, `rest-handlers/`, `router.ts` | Fastify routes matching OpenAPI spec |
| 1A.9 | Event publishers | C5, 1A.6 | `events/publishers/` — emits user domain events on use-case completion | Via InProcessEventBus |
| 1A.10 | Service wrapper | 1A.8, 1A.9, C2, C4 | `services/user-management-svc/` | Fastify app, registers all SDK plugins, mounts module router |
| 1A.11 | Cerbos policies for user resources | B5 | `infra/cerbos/policies/user_management/` | Resource policies, role policies, test fixtures |
| 1A.12 | End-to-end verification | 1A.10, 1A.11 | Can create user, authenticate, get JWT, verify JWT, check Cerbos authorization | Manual or scripted smoke test |

---

## Phase 1B: Configurator Module

Can begin in parallel with User Management. Does not depend on User Management at the code level — but needs a working JWT issuer (1A.7) for auth in integration tests.

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| 1B.1 | Finalize OpenAPI spec | E4 | `specs/openapi/configurator.v1.yaml` | Based on [Configurator LLD](../configurator/01-schema-design.md) |
| 1B.2 | Finalize event schemas | E5 | `specs/events/config.events.yaml` — `tenant.provisioned`, `config.changed`, `module.enabled`, etc. | |
| 1B.3 | Drizzle schema + migrations | C1, B2 | `modules/configurator/src/schema/tables.ts` + initial migration | Two-layer model (platform reference + tenant config) from [Configurator LLD](../configurator/01-schema-design.md) |
| 1B.4 | Domain types + port interfaces | 1B.1 | `domain/`, `ports.ts` | `TenantRepo`, `ModuleRegistryRepo`, `FeatureFlagRepo`, `IntegrationProfileRepo` |
| 1B.5 | Data-access layer | 1B.3, 1B.4 | `data-access/` | Integration tests with Citus |
| 1B.6 | Use-cases | 1B.4 | `use-cases/` — `provision-tenant`, `enable-module`, `toggle-feature-flag`, `update-integration-profile`, etc. | |
| 1B.7 | HTTP + REST handlers | 1B.6 | `http-handlers/`, `rest-handlers/`, `router.ts` | |
| 1B.8 | Event publishers | C5, 1B.6 | `events/publishers/` — config change events | Downstream modules (EMPI, Master Data) will consume these |
| 1B.9 | Service wrapper | 1B.7, 1B.8 | `services/configurator-svc/` | |
| 1B.10 | Cerbos policies | B5 | `infra/cerbos/policies/configurator/` | Super-admin vs tenant-admin separation |
| 1B.11 | End-to-end: provision tenant, enable modules, verify config | 1B.9, 1A.7 (needs JWT) | Can provision a tenant, enable modules, and see config reflected | |

---

## Phase 1C: EMPI Module

Starts after User Management auth works (1A.7) and Configurator's tenant provisioning works (1B.9). The dedup algorithm is ported from the production HIMS.

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| 1C.1 | Finalize OpenAPI spec | E4 | `specs/openapi/empi.v1.yaml` | Registration, search, merge, ABHA linking |
| 1C.2 | Finalize event schemas | E5 | `specs/events/patient.events.yaml` | `patient.created`, `patient.updated`, `patient.merged` — rich payloads |
| 1C.3 | Port dedup algorithm from production | — | `modules/empi/src/domain/dedup/` | The only complex algorithm in the platform. Port logic, write comprehensive tests. |
| 1C.4 | Drizzle schema + migrations | C1, B2 | `modules/empi/src/schema/` | Canonical patient record, identity cross-references, ABHA links |
| 1C.5 | Domain types + ports | 1C.1 | `domain/`, `ports.ts` | `PatientRepo`, `IdentityCrossRefRepo`, `DeduplicationService` port |
| 1C.6 | Data-access layer | 1C.4, 1C.5 | `data-access/` | |
| 1C.7 | Use-cases | 1C.3, 1C.5 | `use-cases/` — `register-patient`, `search-patient`, `merge-patient`, `link-abha` | Dedup runs on registration |
| 1C.8 | HTTP + REST handlers + router | 1C.7 | Fastify routes | |
| 1C.9 | Event publishers + consumers | C5, 1C.7 | Publishes patient events. Consumes `config.changed` (tenant context updates). | |
| 1C.10 | Service wrapper | 1C.8, 1C.9 | `services/empi-svc/` | |
| 1C.11 | Cerbos policies | B5 | Patient resource policies | |

---

## Phase 1D: Master & Tenant Data Module

Can start in parallel with EMPI (1C). Needs Configurator for tenant context.

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| 1D.1 | Finalize OpenAPI spec | E4 | `specs/openapi/master-data.v1.yaml` | ICD-10, LOINC, SNOMED, drugs, procedures, fee schedules |
| 1D.2 | Design master data schema | — | `modules/master-data/src/schema/` | Platform reference data (shared) + tenant overrides pattern from [Configurator LLD](../configurator/01-schema-design.md) |
| 1D.3 | Bulk import tooling | 1D.2 | Use-cases for CSV/JSON import of ICD-10, drug databases, etc. | Critical for usability — tens of thousands of codes |
| 1D.4 | Domain + ports + data-access + use-cases + handlers | 1D.1, 1D.2 | Full module per Module Shape Template | Standard CRUD + search + tenant override logic |
| 1D.5 | TanStack Virtual integration on frontend | D7, 1D.4 | Frontend list views for ICD-10 (~70K), SNOMED (~350K), drug lookup | First real use of TanStack Virtual + TanStack Table |
| 1D.6 | Service wrapper | 1D.4 | `services/master-data-svc/` | |

---

## Phase 1E: Frontend — Module Feature Pages

Runs in parallel with backend module work. Each module's frontend features can start as soon as the OpenAPI spec is finalized (API client is generated).

| # | Task | Blocked by | Deliverable | Notes |
|---|------|-----------|-------------|-------|
| 1E.1 | User Management pages | 1A.1 (spec), D7 (shell) | `routes/_authenticated/user-management/`, `features/user-management/` | User list, create user form, role assignment, user detail |
| 1E.2 | Configurator pages | 1B.1 (spec), D7 | `routes/_authenticated/configurator/`, `features/configurator/` | Tenant management, module enablement, feature flags, integration profiles |
| 1E.3 | EMPI pages | 1C.1 (spec), D7 | `routes/_authenticated/empi/`, `features/empi/` | Patient registration, search (with dedup UI), patient detail, merge workflow |
| 1E.4 | Master Data pages | 1D.1 (spec), D7 | `routes/_authenticated/master-data/`, `features/master-data/` | Reference data browsing, tenant override UI, bulk import UI |

**Pattern for all:** Each feature follows [Frontend LLD §8](../frontend/01-frontend-structure.md): query key factory → queryOptions → route with validateSearch + loader → components with useSuspenseQuery. Permission gating on routes via `beforeLoad` and on actions via `usePermissionsStore`.

---

## Phase 1F: Master Data Design (Parallel Track)

This is schema and LLD design work, not implementation. Runs concurrently with all Phase 1 implementation.

| # | Task | Blocked by | Deliverable |
|---|------|-----------|-------------|
| 1F.1 | Master Data LLD — schema design | — | `docs/architecture/lld/master-data/01-schema-design.md` |
| 1F.2 | Master Data ERD | 1F.1 | `docs/architecture/lld/master-data/master-data.erd.json` |
| 1F.3 | Dev-doubt analysis | 1F.1 | `docs/architecture/lld/master-data/dev-doubts/` |

---

## Phase dependency graph (high level)

```
Phase 0                          Phase 1
─────────────────────────────    ──────────────────────────────────────

Stream A [gate]
    │
    ├── Stream B (infra) ──────────┐
    ├── Stream C (SDKs) ───────────┤
    ├── Stream D (frontend) ───────┤
    ├── Stream E (specs) ──────────┤
    ├── Stream F (CI) ─────────────┤
    └── Stream G (generator) ──────┤
                                   │
                                   ▼
                          ┌────────────────┐
                          │  Phase 0 done  │
                          └───────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              1A: User Mgmt  1B: Config    1F: Master Data
              (auth core)    (tenant core)    (design only)
                    │             │
                    └──────┬──────┘
                           │  both auth + tenant working
                           ▼
                    ┌──────┴──────┐
                    ▼             ▼
              1C: EMPI      1D: Master Data
                                 (implementation)
                    │             │
                    └──────┬──────┘
                           ▼
                    1E: Frontend features
                    (can start per-module as specs finalize)
```

**Note:** 1E (frontend features) doesn't actually wait for all of 1C/1D. Each module's frontend work can start as soon as its OpenAPI spec is finalized — the generated typed client is enough to build the UI against. Backend and frontend development within a module are parallelizable.

---

## Parallelism summary

| Phase | Max parallel streams | Constraint |
|-------|---------------------|------------|
| Phase 0, Stream A | 1 | Everything starts here |
| Phase 0, B-F | 5 | Independent after A completes |
| Phase 0, G | +1 | Starts when C1 + E1 done |
| Phase 1A + 1B | 2 | Can overlap heavily — 1B only needs 1A.7 for integration tests |
| Phase 1C + 1D | 2 | Both start once auth + tenant provisioning work |
| Phase 1E per module | up to 4 | Each module's frontend is independent once its spec exists |
| Phase 1F | 1 | Design work, fully independent of implementation |

**Total parallelizable at peak (mid-Phase 1):** User Management backend, Configurator backend, EMPI backend, Master Data implementation, 2-3 frontend feature tracks, Master Data design — up to 7 parallel streams if team size allows.

---

## What's NOT in this breakdown

- **OPD, Billing, ABDM, Pharmacy, Lab** — Phase 2+ per [Module Build Order](../../analysis/02-module-build-order.md). Starts after Phase 1 platform foundation is solid.
- **ABDM integration** — protocol work can start alongside EMPI but depends on NHA sandbox access and is a separate planning exercise.
- **Offline mode** — Phase 2+ engineering. The architecture supports it (use-cases depend on ports, not implementations), but IndexedDB adapters and the sync engine are deferred.
- **BFF implementation** — deferred to when the first module needs cross-module aggregation. During Phase 1, the frontend calls module APIs directly (or through a simple proxy).

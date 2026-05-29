# Authz Centralization Plan

## Problem

- 9 modules exist, only 3 (user-management, billing, registration) have Cerbos PEP enforcement
- 6 modules (empi, configurator, abdm-adapter, master-data, opd, record-foundation) lack authz entirely or partially
- The 3 existing resolvers each duplicated the same utility functions (normalizeUrl, resolveRoutePattern, resolvePathParam, tenantAttr)
- Each new module must produce: AuthzTargetResolver (if/else chain) + Cerbos YAML policies + service wiring + route markings

## Module Authz Survey (Phase 0 — 9 modules)

| Module | Routes | Language | Cerbos PEP | Notes |
|--------|--------|----------|-----------|-------|
| user-management | 27 | TS | Full | 21 inline, 6 DB-backed resolver routes (dept/clearance/org_id lookups) |
| billing | 11 | TS | Full | 11 inline, resolver deleted |
| registration | 5 | TS | Full | 5 inline, resolver deleted |
| empi | 9 | TS | None | Patient routes, no auth at all |
| configurator | 14 | TS | Partial | 3 route guarded by `assertPlatformSuperAdmin` (pre-Cerbos), rest open |
| abdm-adapter | 52 | TS | None | 5 sub-modules (M0–M3), no auth at all |
| master-data | ~127 | Python | Policy exists | Cerbos policy exists at `infra/cerbos/policies/master_data_visitpad.yaml` but never evaluated |
| opd | 1 | Python | None | Scaffold only — health check endpoint |
| record-foundation | 0 | TS | None | Empty stub, no package.json |

**Total routes needing Level 3 authz**: ~203 (empi 9 + configurator 14 + abdm-adapter 52 + master-data ~127 + opd 1)

## Three-Level Plan

### Level 1 (DONE) — Shared Resolver Utilities

PR #135: `feat/authz-level-1 → feat/authz-centralization` (+71 / -99, 5 files)

- Created `packages/ts-sdk-authz/src/resolver-utils.ts` with 4 shared exports:
  - `normalizeUrl(url)` — strip query string, remove trailing slash
  - `resolveRoutePattern(request, prefix)` — get normalized path relative to API prefix
  - `resolvePathParam(request, name?)` — extract named path param
  - `iqTenantAttr(request)` — build `{ iq_tenant_id }` from `request.tenantId`
- Refactored existing resolvers (no behavioural change):
  - registration resolver: 62 → 33 lines
  - billing resolver: 96 → 92 lines
  - user-management resolver: 275 → 262 lines
- All 48 Cerbos tests pass. No new lint errors.

### Level 2 (DONE) — Convention-Based Route Targets

PR #136: `feat/authz-level-2 → feat/authz-level-1` (+156 / -326, 18 files)

- Added `InlineAuthzTarget` type + `FastifyContextConfig.authz` augmentation in `packages/ts-sdk-authz/src/types.ts`
- Modified `authzPlugin` in `packages/ts-sdk-authz/src/plugin.ts`:
  - Convention-first preHandler: checks `config.authz` first, falls back to `resolveTarget` (escape hatch)
  - `onReady` validates inline configs match registered routes on startup
  - Auto-injects `iq_tenant_id` on all inline targets from `request.tenantId`
  - Auto-infers `id` from first path param when omitted
- **Registration** (5 routes): resolver deleted (`registration-authz-target-resolver.ts` removed, -39 lines)
- **Billing** (11 routes): resolver deleted (`billing-authz-target-resolver.ts` removed, -73 lines)
- **User-management** (27 routes): 21 moved to inline `config.authz`, 6 stay in resolver (DB-backed resource attrs: department/clearance/org_id)
- Resolver shrunk from 262 → 118 lines (handles only the 6 DB-backed routes)
- All 48 Cerbos tests pass. No new lint errors.

### Level 3 — Service-Layer Boilerplate Helper + Python Cerbos Client

#### 3a (IN PROGRESS) — `registerAuthzStack()` + TypeScript Modules
Decisions made (2026-05-28):
- Configurator: per-entity Cerbos kinds (`organization`, `tenant`, `tenant_module`, `tenant_onboarding`)
- `registerAuthzStack()`: DI-based (caller passes identityPlugin + enrichmentPlugin)
- EMPI resource kind: `patient` (cap key: `empi:patient:*`)
- abdm-adapter: deferred to separate discussion

- Create `registerAuthzStack()` in `ts-sdk-authz` — DI-based helper (caller passes plugins; zero new deps on ts-sdk-authz)
- Create `createDefaultPrincipalDeps()` in `modules/user-management` — wires Drizzle repos + PrincipalService
- Add Cerbos policy YAMLs for new modules using the 3-tier template (see below)
- Apply authz to:
  - **empi** (9 routes) — resource kind `patient`, single YAML + tests
  - **configurator** (14 routes) — 4 resource kinds: organization (4 routes), tenant (4), tenant_module (5), tenant_onboarding (1)
    - Migrate from `assertPlatformSuperAdmin` (3 routes) + `assertTenantOnboardingAllowed` (1 route) to Cerbos
    - Delete `tenant-onboarding-access.ts` + `request-auth-context.ts` dead code
- Refactor billing-svc, registration-svc, user-management-svc, empi-svc, configurator-svc main.ts
- Detailed implementation plan: `.opencode/plans/authz-level-3a-plan.md` (~28 files touched)

#### 3b — Python Cerbos Client (`py-sdk-authz`) + Master Data
- New `packages/py-sdk-authz/`:
  - `client.py` — Cerbos gRPC wrapper
  - `types.py` — Pydantic models
  - `middleware.py` — ASGI middleware (authzPlugin equivalent)
  - `dependency.py` — `@require_authz(kind, action)` decorator
- Apply to:
  - **master-data** (~127 routes across 16 route files) — add `@require_authz` decorators, new Cerbos policies
  - **opd** (when routes are defined)

## Branch Strategy

- PR #135: `feat/authz-level-1 → feat/authz-centralization` (shared utils)
- PR #136: `feat/authz-level-2 → feat/authz-level-1` (inline targets, stacked on #135)
- PR #137+: `feat/authz-level-3a → feat/authz-level-2`
- PR #138+: `feat/authz-level-3b → feat/authz-level-2` (or 3a, depending on ordering)
- `feat/authz-centralization` merges into `dev` when all levels are complete and reviewed

Note: PRs are currently stacked sequentially (each targets the prior level's branch), not all directly targeting `feat/authz-centralization`.

## Cerbos Policy Template

Every new module follows the 3-tier pattern:

```yaml
rules:
  # 1. Same-tenant
  - actions: ["<action>"]
    roles: ["*"]
    effect: EFFECT_ALLOW
    condition: { match: { expr: "tenant_match && capability_check" } }
  # 2. Super-admin bypass
  - actions: ["<action>"]
    roles: ["super-admin"]
    effect: EFFECT_ALLOW
    condition: { match: { expr: "capability_check" } }
  # 3. Cross-tenant super-admin
  - actions: ["<action>"]
    roles: ["*"]
    effect: EFFECT_ALLOW
    condition: { match: { expr: "cross_tenant_super_admin_check" } }
```

## Key Design Decisions

- **Convention + escape hatch**: ~80% of routes use simple `config.authz` inline; ~20% needing DB-loaded attrs use resolver or `resolveAttr`
- **Auto `iq_tenant_id`**: always injected from `request.tenantId` — matches Cerbos policy contract (`request.principal.attr.iq_tenant_id == request.resource.attr.iq_tenant_id`)
- **Auto `id` inference**: when omitted, extracts first path param from `request.params`
- **Resolvers deleted when emptied**: registration and billing resolvers fully removed; user-management resolver shrunk to 118 lines (only 6 DB-backed routes remain)
- **Deny by default**: Cerbos engine evaluates to `EFFECT_DENY` if no ALLOW rule matches — no explicit test needed for the engine default

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Convention breaks unusual authz | Resolver escape hatch handles any edge case |
| `resolveAttr` adds latency | Same DB query the resolver would do today. No new cost. Decision cache already exists. |
| Python client differs from TS client | Shared Cerbos test suites validate behavior. PDP is authority. |
| BFF needs its own authz client | Cerbos PDP is independently callable from HTTP. BFF talks directly to PDP. |
| Author forgets `config.authz` | `onReady` validation catches at startup — same as today's resolver validation |

## Cerbos Policy Directory

All policies live at `infra/cerbos/policies/`.

Current policies (10 files):
- `user_management/` — user, auth, user_role_template, role, capability (5 files)
- `registration/` — registration (1 file)
- `billing/` — tariff_master, invoice, billing_account (3 files)
- `master_data_visitpad.yaml` — exists but never evaluated (1 file)

Test suites: 9 files in `infra/cerbos/tests/`. Gaps: registration, capability, invoice, billing_account, master_data_visitpad have no tests.

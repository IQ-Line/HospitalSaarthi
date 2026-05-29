# PR #122 Review — `feat/hims-authz`

## What PR #122 Did
Tech lead's original authz PR introduced:
- Initial Cerbos policy files in `infra/cerbos/policies/`
  - `user_management/` — user, auth, user_role_template, role, capability
  - `registration/` — registration
  - `billing/` — tariff_master, invoice, billing_account
  - `master_data_visitpad.yaml`
- `packages/ts-sdk-authz/` — the shared authz SDK
  - `authzPlugin` Fastify plugin with preHandler
  - `cerbos-client.ts` — Cerbos gRPC/HTTP client wrapper
  - `principal-attr.ts` — Principal attribute mapping
  - `decision-cache.ts` — Per-request decision dedup
  - `middleware.ts` — Legacy createPepMiddleware
- Per-module `resolveTarget` resolvers in billing, registration, user-management services
- `infra/cerbos/tests/` — 9 Cerbos YAML test suites

## Issues Found
1. **Duplicated URL normalization** — each resolver reimplemented route pattern matching (`normalizeUrl`, `resolveRoutePattern`)
2. **No convention-first approach** — every route required a resolver, even for simple `{kind, action}` targets. ~80% of routes need only static `kind`/`action` + `iq_tenant_id`
3. **No `iq_tenant_id` auto-injection** — each resolver had to manually attach tenant attr from `request.tenantId`
4. **Resolver logic scattered** — resolvers in service packages (`services/*/src/`), not co-located with route handlers in `modules/*/src/`
5. **No type augmentation** — `config.authz` not typed on `FastifyContextConfig`, required casting

## What Was Kept
- Core Cerbos client wrapper (`client.ts`) — solid gRPC/HTTP implementation
- Cerbos policy YAML files — correct ABAC contracts with 3-tier pattern (same-tenant, super-admin, cross-tenant)
- Cerbos test framework — 9 YAML test suites with comprehensive scenarios
- Plugin preHandler structure — good Fastify integration pattern
- Principal attribute mapping (`principal-attr.ts`) — correct Cerbos principal wire format

## What Was Changed (Levels 1-2)
- **Level 1** (PR #135): Extracted shared utilities → `resolver-utils.ts` (normalizeUrl, resolveRoutePattern, resolvePathParam, iqTenantAttr)
  - registration resolver: 62 → 33 lines
  - billing resolver: 96 → 92 lines
  - user-management resolver: 275 → 262 lines
- **Level 2** (PR #136): Convention-first authz
  - Added `InlineAuthzTarget` type + `FastifyContextConfig.authz` augmentation in `types.ts`
  - Convention-first preHandler: checks `config.authz` before resolver fallback
  - Auto `iq_tenant_id` injection on all inline targets
  - Auto `id` inference from path params when omitted
  - `onReady` validation of inline configs against registered routes
  - Registration and billing resolvers deleted (fully inline — 5 and 11 routes respectively)
  - User-management resolver shrunk from 262 → 118 lines (21 inline, 6 DB-backed routes remain)

## What's Still TODO (Level 3)
- `registerAuthzStack()` helper for zero-boilerplate service setup in TypeScript services
- Add authz to empi (9 routes), configurator (14 routes, migrate from `assertPlatformSuperAdmin`)
- Add authz to abdm-adapter (52 routes across 5 sub-modules)
- Python Cerbos client (`py-sdk-authz`) for Alembic-based services
- Add authz to master-data (~127 routes, 16 route files)
- Cerbos test coverage for untested policies: registration, capability, invoice, billing_account, master_data_visitpad

# HIMS Auth Architecture Context

## Stack
- **Authn**: better-auth — identity, sessions, OAuth
- **Authz**: Cerbos PDP (sidecar, loaded with `infra/cerbos/policies/`) — ABAC policy engine
- **Tenancy**: Dual-schema PostgreSQL (public schema for tenants, per-tenant schemas for data)
- **Sentinel**: Middleware that extracts tenant from JWT/subdomain, attaches to request, switches DB schema

## Tenant Resolution Flow
1. Request arrives → sentinel extracts tenant_id from JWT claims or subdomain
2. `request.tenantId` set → `iq_tenant_id` attr on Cerbos principal
3. DB schema switched to `tenant_{id}` for data queries
4. Authz plugin checks Cerbos PDP: `principal (user+tenant) × resource (kind+id+tenant) × action`

## Cerbos PEP Architecture
- `packages/ts-sdk-authz` — shared authz package (TypeScript services)
  - `src/plugin.ts`: Fastify plugin with preHandler (289 lines)
  - `src/types.ts`: `InlineAuthzTarget`, `AuthzTargetResolver`, `FastifyContextConfig.augmentation` (76 lines)
  - `src/resolver-utils.ts`: URL normalization, path param extraction, tenant attr helper (32 lines)
  - `src/client.ts`: Cerbos gRPC/HTTP client wrapper
  - `src/cerbos-startup-probe.ts`: Startup reachability probe (`assertCerbosReachable`)
  - `src/principal-attr.ts`: Maps identity Principal to Cerbos attributes
  - `src/decision-cache.ts`: Per-request DecisionCache for dedup
  - `src/middleware.ts`: Legacy `createPepMiddleware`
- Module resolvers: custom `resolveTarget` functions passed to plugin (user-management only — 6 routes; billing and registration resolvers deleted)

## Authz Coverage (Phase 0)

### With Cerbos PEP
| Module | Routes | Strategy |
|--------|--------|----------|
| user-management | 27 | 21 inline `config.authz` + 6 resolver (DB-backed dept/clearance/org_id) |
| billing | 11 | 11 inline `config.authz`, resolver deleted |
| registration | 5 | 5 inline `config.authz`, resolver deleted |

### Without Cerbos PEP
| Module | Routes | Notes |
|--------|--------|-------|
| empi | 9 | Patient routes, no auth at all |
| configurator | 14 | 3 guarded by pre-Cerbos `assertPlatformSuperAdmin`, rest open |
| abdm-adapter | 52 | No auth (M0–M3 sub-modules) |
| master-data | ~127 | Policy at `infra/cerbos/policies/master_data_visitpad.yaml` exists but never evaluated in handler |
| opd | 1 | Health check only (scaffold) |
| record-foundation | 0 | Empty stub |

## Cerbos Policy Inventory

All policies at `infra/cerbos/policies/`:

| Kind | File | Module | Tested? |
|------|------|--------|---------|
| `user` | `user_management/user.yaml` | user-management | Yes (5 suites) |
| `auth` | `user_management/auth.yaml` | user-management | Yes |
| `user_role_template` | `user_management/user_role_template.yaml` | user-management | Yes (2 suites) |
| `role` | `user_management/role.yaml` | user-management | Partial (only `role.create`) |
| `capability` | `user_management/capability.yaml` | user-management | No |
| `registration` | `registration/registration.yaml` | registration | No |
| `tariff_master` | `billing/tariff_master.yaml` | billing | Yes |
| `invoice` | `billing/invoice.yaml` | billing | No |
| `billing_account` | `billing/billing_account.yaml` | billing | No |
| `master_data:visitpad` | `master_data_visitpad.yaml` | master-data | No |

## Sentinel Analysis
- Sentinel is NOT an API gateway — it's a Fastify onRequest hook
- Sets `request.tenantId` from JWT → enables per-request schema routing
- Does NOT perform authz — only identity and tenancy context
- Authz is always a separate Cerbos PDP check in the authz plugin preHandler

## Key Files
- `packages/ts-sdk-authz/src/plugin.ts` — main Fastify authz plugin
- `packages/ts-sdk-authz/src/types.ts` — type definitions
- `packages/ts-sdk-authz/src/resolver-utils.ts` — shared resolver utilities
- `packages/ts-sdk-authz/src/cerbos-client.ts` — Cerbos client wrapper
- `infra/cerbos/policies/` — Cerbos policy YAML files (10 files)
- `infra/cerbos/tests/` — Cerbos test suites (9 files)

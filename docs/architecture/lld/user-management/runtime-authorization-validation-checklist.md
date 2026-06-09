# Runtime authorization validation checklist

## Authority boundaries

| Layer | Authority | Runtime use |
|-------|-----------|-------------|
| Master Data | Module catalog (`module_id` → `slug`) | HTTP adapter only; never queried for PDP decisions |
| Configurator | Tenant-enabled `module_id` set | Entitlement gate for assignable capabilities |
| User Management | `capabilities` rows + grants | Cerbos PDP vocabulary and runtime grants |
| Cerbos | Policy decision | `capability_key` evaluation |

UM does **not** query MD permissions at runtime. Future MD → UM sync is one-way via `CapabilityCatalogSyncPort`.

## Principal composition

- JWT provides identity (`sub`, `iq_tenant_id`).
- UM enriches principal with role codes, **effective** capability keys (stored grants ∩ tenant entitlement), clearances, delegated keys.
- Cerbos receives normalized resource attributes from UM handlers.
- `tenant_entitlement_revision` on principal attributes supports SPA cache busting (ADR-0032).

## Runtime effective capabilities (ADR-0032)

```
effective_capabilities = stored_grants ∩ tenant_entitlement
tenant_entitlement     = capability_keys(listAssignableRuntimeCapabilities)
```

- Stored grants (`user_capabilities`, `delegated_capability_grants`) are never deleted on module disable.
- Principal hydration intersects before Cerbos and `GET /auth/principal`.
- Per-tenant entitled-keys cache (60s TTL); bust via Configurator module lifecycle events + HTTP invalidation hook.
- `RUNTIME_ENTITLEMENT_INTERSECTION=false` disables intersection on PEP services (rollback).

## Entitlement flow

1. Configurator: tenant-enabled module IDs (cacheable for reads; bypassed on mutations/asserts).
2. Master Data: resolve module slugs (bounded catalog map cache).
3. Union platform runtime slugs (`user-management`, `configurator`).
4. Filter UM `capabilities` by module slug.
5. Fail closed on upstream errors (`MODULE_ENTITLEMENT_LOOKUP_FAILED`).

## Assignable capability flow

- `GET /capabilities/assignable` — tenant-filtered role editor catalog.
- `GET /capabilities` — full runtime catalog (admin/diagnostics).
- Internal diagnostics mirror assignable/full catalog without raw upstream payloads.

## Fail-closed guarantees

- Upstream timeout / 5xx / network → no grant widening.
- Entitlement assert uses `cachePolicy: bypass-cache`.
- No fallback to full catalog when tenant modules are unknown.

## Cache semantics

- Bounded in-process TTL caches (Configurator per-tenant module IDs, MD slug map).
- Hit/miss/expiry/eviction logged.
- Explicit invalidation APIs on HTTP adapters.
- Stale data must not widen assignable set; mutation paths bypass cache.

## Startup invariants

- `CONFIGURATOR_URL` and `MASTER_DATA_URL` required (non-empty).
- `PLATFORM_RUNTIME_MODULE_SLUGS` valid and duplicate-free when normalized.
- Seeded/runtime capabilities: valid module slugs, provenance integrity, canonical `capability_key` vocabulary (see [runtime-capability-vocabulary.md](./runtime-capability-vocabulary.md)).

## Transaction semantics

- `createUser`: validate entitlements → provision auth → single DB transaction (user + manual grants + role templates) → publish event after commit.
- Orphan auth account possible if DB transaction fails after auth provision (auth rolled back separately is future work).

## Remaining future work

- `CapabilityCatalogSyncPort` implementation (MD permissions → UM capabilities).
- Compensating rollback for auth account when DB provisioning fails.
- Distributed cache / event-driven cache invalidation when tenant modules change.

## Verification commands

```bash
pnpm exec nx run user-management:test
pnpm exec nx run user-management-svc:test
pnpm exec nx run web:test
pnpm exec tsx services/user-management-svc/scripts/validate-user-management-openapi.mts
# Cerbos: from repo root, per project CI policy
```

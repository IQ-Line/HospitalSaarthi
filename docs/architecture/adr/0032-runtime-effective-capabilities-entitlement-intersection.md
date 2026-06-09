# ADR-0032: Runtime effective capabilities = stored grants ∩ tenant entitlement

- **Status:** Accepted
- **Date:** 2026-06-06
- **Deciders:** User Management module owners, platform architecture
- **Related:** ADR-0031, Configurator `tenant_modules`, `listAssignableRuntimeCapabilities`

## Context and problem statement

Tenant module enablement (`configurator.tenant_modules`) gates navigation and **assignable** capability composition, but principal hydration loads **stored** capability snapshots without intersecting tenant entitlement. Disabling a module hides nav and blocks new grants; existing `user_capabilities` rows remain and Cerbos still receives unfiltered keys — deep links and API calls may succeed until grants are manually revoked.

## Decision drivers

- **Stored grants are immutable at disable time** — re-enable must restore access without re-provisioning.
- **Single runtime enforcement point** — Cerbos PEP, `GET /auth/principal`, and SPA permissions must agree.
- **Reuse assignable resolution** — tenant entitlement equals capability keys from `listAssignableRuntimeCapabilities` (Configurator + Master Data + UM catalog rules).
- **No per-user effective cache** — entitlement is tenant-scoped; intersect per request (with tenant-level cache only).
- **Fail-closed** — Configurator/Master Data outage during hydration denies enrichment (same as assignable writes).

## Decision outcome

At **principal hydration** (`DefaultPrincipalService.getPrincipal`):

```
tenant_entitlement_keys = capability_keys(listAssignableRuntimeCapabilities(tenantId))
stored_direct           = active user_capabilities snapshot keys
stored_delegated        = active delegated_capability_grants keys (in window)

effective_direct        = stored_direct ∩ tenant_entitlement_keys
effective_delegated     = stored_delegated ∩ tenant_entitlement_keys
```

Cerbos receives `effective_*` on `principal.attr.capabilities` and `delegated_capabilities`. Database rows unchanged.

### Vocabulary

| Term | Meaning |
|------|---------|
| **stored_grants** | Persisted UM rows (`user_capabilities`, `delegated_capability_grants`) |
| **tenant_entitlement** | Capability keys operable for tenant (same set as assignable catalog) |
| **effective_capabilities** | Intersection emitted on principal / Cerbos wire |

### Caching

- Per-tenant entitled-keys cache (in-process TTL, aligned with Configurator adapter ~60s).
- Invalidation on `module.enabled` / `module.disabled` events and Configurator tenant-module mutations.
- `tenant_entitlement_revision` on principal attributes for SPA coherence (derived from tenant module `updated_at` fingerprint).

### Feature flag

`RUNTIME_ENTITLEMENT_INTERSECTION` (default `true`) on PEP services allows rollback without DB migration.

## Consequences

- All PEP services (user-management, billing, registration) must wire entitlement resolution into `DefaultPrincipalService`.
- Configurator/MD outages block authenticated requests (fail-closed) — increased blast radius vs pre-ADR behavior.
- `GET /users/:id/effective-capabilities` returns the same effective keys as `/auth/principal` for the subject user.
- Cerbos policies unchanged — pre-filter principal attributes.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Cerbos policy AND tenant entitlement | Duplicates intersection; policy drift |
| Route-guard-only entitlement | UX layer; APIs remain open |
| Revoke grants on module disable | Data loss; re-enable requires re-assignment |
| Per-user effective cache | Stale per-user state; unnecessary |

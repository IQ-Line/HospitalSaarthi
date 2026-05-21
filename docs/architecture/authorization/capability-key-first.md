# Capability-key-first frontend authorization

## Single source of truth

Runtime authorization for APIs and Cerbos PDP is defined by **capability keys** on the authenticated principal (`GET /auth/principal` → `attributes.capabilities` and `attributes.delegated_capabilities`). Those keys come from the User Management `user_capabilities` snapshot and the UM capability catalog.

The frontend shell mirrors that same vocabulary. It does **not** maintain a parallel module/feature/action model or a UX permission map.

## Frontend authorization model

| Layer | Primitive | Purpose |
|-------|-----------|---------|
| Zustand store | `capabilityKeys: Set<string>` | Sole client-side auth state |
| React | `useCapability`, `useAnyCapability`, `useAllCapabilities` | Component gates |
| JSX | `<CapabilityGate capability="…" />` | Declarative hide/show |
| Router | `requireCapability`, `requireAnyCapability`, `requireAllCapabilities` | `beforeLoad` route guards |
| Constants | `@/lib/runtime-capability-keys` | Avoid string drift |

Hydration: `hydrateCapabilitiesFromPrincipal()` loads principal attributes only. Development uses seeded better-auth users — see [development authentication](../auth/development-authentication.md).

Navigation: `NAVIGATION_REGISTRY` entries declare `requiredCapabilities` (and tenant module gates). No `hasModuleAccess` or UX-map fallback.

## Why UX permission maps were removed

The former `GET /auth/permissions-map` and `buildUxPermissionMap()`:

- Re-probed Cerbos per feature/action for User Management only
- Projected Cerbos actions into coarse `read` / `write` flags
- Required hand-maintained tuples (`user-management` / `users` / `read`) that duplicated catalog keys
- Did not scale to Visitpad, Configurator, Master Data, or dozens of modules

That path was **UX-only** but looked like a second source of truth. New modules would have needed more bespoke probes and map entries.

## Enterprise scalability rationale

1. **One vocabulary** — Catalog keys (`um:user:read`, `md:visitpad:view`) are stable across PDP, principal, nav, and UI.
2. **No N×M Cerbos probes for nav** — Shell reads O(keys) from principal instead of O(features×actions) map builds.
3. **Module growth** — New surfaces add keys to the catalog and registry; no new projection layer.
4. **Cerbos stays authoritative** — Frontend gates improve experience; denied API calls still fail at the PDP.

## Migration notes (breaking)

Removed without compatibility shims:

- `permissions-map.ts`, `hasFeaturePermission`, `um-permissions.ts`
- `permissions.store.map`, `hasModuleAccess`, `setPermissions`
- `useVisitpadCatalogPermission` (replaced by capability keys / `useVisitpadCatalogCapabilities`)

Shell keys such as `md:shell:access`, `cfg:shell:access`, and `fd:shell:access` gate nav until module-specific catalog keys exist; grant them on principals (dev sets include them).

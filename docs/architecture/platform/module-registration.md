# Module registration (enterprise SPA)

## Goal

New product modules become visible on the platform **without hardcoding Master Data UUIDs**, static slug maps, or per-module sidebar components. The shell composes navigation from:

1. **Module manifests** registered in the SPA (built-in or future plugins)
2. **Master Data** module catalog (`GET /api/v1/master-data/modules`) — authoritative `id` ↔ `slug`
3. **Configurator** tenant enablement (`GET /api/configurator/v1/tenants/{id}/modules`)
4. **Capability keys** on the principal (Cerbos UX mirror)

## `ModuleManifest`

```ts
type ModuleManifest = {
  slug: string;              // joins to master_data.modules.slug
  name: string;
  icon?: string;
  routePrefix: string;
  navigation: NavigationNode[];
  requiredCapabilities?: string[];
  tenantScoped?: boolean;    // false for dashboard / platform shell
  requiredModulesAny?: string[]; // OR gate on catalog slugs (e.g. visitpad-templates)
  sortOrder?: number;
};
```

Manifests live under `services/web/src/platform/modules/manifests/*.manifest.ts` and are registered at bootstrap via `registerBuiltinModuleManifests()`.

## Runtime pipeline

```
registerModuleManifest()     // built-in + future plugins
        ↓
composeNavigationManifest()  // cached NavigationNode[]
        ↓
filterNavigationTree(ctx)    // capabilities + enabledModuleSlugs
        ↓
GenericSidebarRenderer
```

### Tenant enablement (no static UUID map)

```
tenant_modules.module_id
        ↓ join
Master Data catalog.byId
        ↓
enabledModuleSlugs: Set<slug>
```

Implemented in `useEnabledTenantModuleSlugs()` (`platform/modules/use-enabled-tenant-modules.ts`).

**Removed:** `KNOWN_MODULE_ID_TO_SLUG`, platform module allowlists, capability-prefix inference, hardcoded navigation-only module assumptions.

When Configurator or Master Data cannot resolve `tenant_modules`, navigation treats **no modules as enabled** (empty set) after loading completes — do not infer slugs from capability keys.

## Caching and invalidation

| Data | Cache | Invalidation |
|------|-------|----------------|
| Module catalog | React Query, 5 min stale | `invalidateModuleRegistration()` |
| Composed nav tree | In-memory until registry changes | `invalidateComposedNavigationCache()` on register / invalidation |
| Tenant modules | React Query per `tenantId` | Tenant switch, provisioning, `invalidateModuleRegistration` |

`refreshAuthorizationContext()` calls `invalidateModuleRegistration(queryClient, tenantId)` after principal hydration.

## Adding a new module

1. **Master Data** — create catalog row with stable `slug`.
2. **Configurator** — enable via `tenant_modules` (provisioning or admin UI).
3. **Cerbos / UM** — ship runtime capability keys for the module.
4. **SPA manifest** — add `platform/modules/manifests/<slug>.manifest.ts` and register in `register-builtin-modules.ts` (or call `registerModuleManifest` from a plugin entry).
5. **TanStack Router** — add routes under `routePrefix` (file-based routes unchanged).
6. **Optional** — extend `runtime-capability-keys.ts` and dev capability sets.

No changes to `GenericSidebarRenderer`, `filter-navigation-tree.ts`, or `AppSidebar` are required.

## Future: server-driven manifests

The composed `NavigationNode[]` shape is identical to the former `NAVIGATION_MANIFEST`. A later iteration can:

- Fetch manifests from Master Data or a platform registry API
- Call `registerModuleManifest` for each entry at runtime
- Bust caches via `invalidateModuleRegistration`

## Related docs

- [Navigation manifest (frontend)](../frontend/navigation-manifest.md)
- [Runtime capability keys only](../authorization/runtime-capability-keys-only.md)
- [Configurator LLD — tenant_modules](../lld/configurator/01-schema-design.md)

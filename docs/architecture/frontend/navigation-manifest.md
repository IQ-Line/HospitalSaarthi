# Navigation manifest architecture

## Overview

The authenticated shell renders navigation from **registered module manifests** composed into a tree (`composeNavigationManifest`). There are no module-specific sidebar components, no `switch (sectionKey)`, and no parallel nav trees in feature folders.

Adding a module is a **manifest registration** change plus Master Data catalog + tenant enablement. See [module registration](../platform/module-registration.md).

## Data model

```ts
type NavigationNode = {
  id: string;
  label: string;
  icon?: string;              // key into NAVIGATION_ICONS
  route?: string;
  search?: Record<string, unknown>;
  requiredCapabilities?: string[];
  requiredCapabilitiesAll?: string[];
  requiredModules?: string[];
  requiredModulesAny?: string[];
  children?: NavigationNode[];
};
```

| Field | Purpose |
|-------|---------|
| `requiredCapabilities` | Visible if principal holds **any** listed key |
| `requiredCapabilitiesAll` | Visible only if principal holds **every** listed key |
| `requiredModules` | Tenant must have **all** module slugs enabled |
| `requiredModulesAny` | Tenant must have **at least one** module slug enabled |
| `children` | Nested items; parent is a collapsible group |

Icons are string keys resolved via `navigation/navigation-icons.ts` (Lucide map). No React types in the manifest file.

## Runtime pipeline

```
registerModuleManifest (built-in / plugin)
  → composeNavigationManifest()
  → filterNavigationTree(ctx)     // capabilities + tenant module slugs from MD catalog
  → GenericSidebarRenderer
       → GenericNavTree
            → GenericNavNode (link or group)
```

**Dashboard discovery:** `collectModuleDiscoveryEntries(filtered)` exposes one card per top-level module (first routable descendant for groups).

## Files

| Path | Role |
|------|------|
| `platform/modules/manifests/*.manifest.ts` | Per-module registration |
| `platform/modules/module-registry.ts` | Dynamic registry |
| `navigation/navigation-manifest.ts` | Composed tree export (tests) |
| `navigation/filter-navigation-tree.ts` | Filtering + discovery helpers |
| `navigation/use-filtered-navigation.ts` | Hook for sidebar |
| `components/navigation/generic-*.tsx` | Generic renderer |
| `components/layout/app-sidebar.tsx` | Shell wiring |

## Adding a new module (no renderer changes)

1. Add icon key to `navigation-icons.ts` if needed.
2. Append a `NavigationNode` to `NAVIGATION_MANIFEST` with `requiredCapabilities` and tenant module gates.
3. Add child nodes with `route` paths matching TanStack Router files.
4. Grant capability keys on principals (or dev capability sets).

## Enterprise rationale

- **Scales to 100+ modules** — one filter algorithm, one renderer.
- **Aligns with capability-key-first auth** — same keys as Cerbos / principal.
- **API-ready** — manifest shape can be loaded from Master Data without refactoring the shell.
- **No drift** — child routes are not duplicated in React components.

## Removed (breaking)

- `registry-nav-renderer.tsx` and `switch (sectionKey)`
- `*NavSection.tsx` per module
- `NAVIGATION_REGISTRY` link/section discriminated union
- `resolveLabel` / `resolveRoute` functions on registry entries

Dynamic UM labels are expressed as separate child nodes (`Users`, `Roles`) with distinct capability requirements.

# Frontend capability-key migration

> **Superseded:** The breaking migration is complete. See [capability-key-first.md](../../authorization/capability-key-first.md) for the current model (no UX map, no dual system).

> **Purpose (historical):** Define the target authorization model for the SPA shell and how it coexists with the legacy UX permission map during Phase 0 → enterprise scale.
>
> **Related:** [03-permissions-catalog-vs-runtime.md](./03-permissions-catalog-vs-runtime.md), [User Management capability vocabulary](../user-management/04-module-capability-vocabulary.md), ADR-0018 (frontend auth is UX-only).

---

## Why capability-key-first

Runtime capability keys (`um:user:read`, `md:visitpad:view`, …) are the **same strings** Cerbos policies and User Management persistence use. They are:

- Stable across modules (not tied to one feature folder)
- Composable in role editors (`GET /capabilities/assignable`)
- Auditable and align with `GET /auth/principal` → `attributes.capabilities`

The legacy SPA shape — `map[module][feature][action]` — was a Cerbos **projection** for User Management only. It does not scale to 100+ modules and drifts from PDP vocabulary (e.g. `users.write` vs `um:user:create`).

**Target:** UI gates and route guards check **capability keys**. The UX map remains temporarily for backward compatibility.

---

## Transitional coexistence (do not break Phase 0)

| Layer | Status | Use for |
|--------|--------|---------|
| **Principal capability keys** | Production path via `hydratePermissionsFromBackend` | Source of truth when present |
| **UX permission map** | Legacy; UM-only from `GET /auth/permissions-map` | Fallback when key not in principal set |
| **`hasFeaturePermission` / `canX()`** | Deprecated; keep until migrated | Existing routes and UM screens |
| **Capability primitives** | **Preferred for new code** | Buttons, nav, new routes |

Resolution lives in `services/web/src/lib/capability-resolution.ts`:

1. If `capabilityKeys` (from principal) contains the key → **allow**
2. Else if UX map projects to that key → **allow** (UM + visitpad catalog today)
3. Else → **deny**

This preserves dev login (`buildDevPermissionMap`) and existing UM behavior while new code uses keys.

---

## Primitives (enterprise-safe, additive)

### Imperative (routes, loaders, non-React)

```ts
import { hasCapability, hasAnyCapability, hasAllCapabilities } from '@/lib/capabilities';
import { requireCapabilities } from '@/lib/require-capabilities';

// Single check
if (hasCapability('um:user:read')) { ... }

// TanStack Router — opt-in per route; do not bulk-migrate in one PR
export const Route = createFileRoute('/_authenticated/example/')({
  beforeLoad: requireCapabilities('um:user:read'),
  // or: requireCapabilities(['um:a', 'um:b'], { mode: 'any', redirectTo: '/dashboard' }),
});
```

### React hooks

```ts
import { useCapability, useAnyCapability, useAllCapabilities } from '@/hooks/use-capability';
```

### Declarative gate

```tsx
import { CapabilityGate } from '@/components/capability-gate';
import { UM_USER_CREATE } from '@/lib/runtime-capability-keys';

<CapabilityGate capability={UM_USER_CREATE} fallback={null}>
  <Button>Add user</Button>
</CapabilityGate>

<CapabilityGate any={['um:role:read', 'um:role:create']}>
  ...
</CapabilityGate>
```

Props: `capability`, `any` / `anyOf`, `all` / `allOf`, `fallback`.

### Constants

Use `services/web/src/lib/runtime-capability-keys.ts` for UM keys (mirrors `modules/user-management/.../user-management-capabilities.ts`). Add module-specific key files as modules grow, or generate from OpenAPI/catalog later.

---

## How new modules should implement auth

1. **Backend:** Define `capability_key` rows in UM and Cerbos policies; expose keys on `GET /auth/principal`.
2. **Shell:** Add entries to `navigation/navigation-registry.ts` with `requiredCapabilities` (not only `hasModuleAccess`).
3. **Routes:** Use `requireCapabilities([...])` in `beforeLoad` for new routes.
4. **UI:** Use `CapabilityGate` / `useCapability` for mutating controls; avoid new `canX()` helpers.
5. **Do not** add cases to `buildUxPermissionMap` for new modules — extend principal capabilities instead.

---

## Migration checklist (incremental)

- [ ] New UI: `CapabilityGate` / `useCapability` only
- [ ] New routes: `requireCapabilities` instead of `hasFeaturePermission` in `beforeLoad`
- [ ] Replace `um-permissions.ts` call sites module-by-module
- [ ] Expand UX-map projection only where principal hydration is blocked (dev-only)
- [ ] Remove `buildDevPermissionMap` from production paths
- [ ] Retire `hasFeaturePermission` when shell uses principal keys only

---

## What not to change yet

- Cerbos policy YAML (PDP contract)
- `buildUxPermissionMap` handler (still serves legacy clients)
- Existing route `beforeLoad` guards until explicitly migrated
- `hasFeaturePermission` store API

APIs and Cerbos remain the **security boundary**; these primitives are **UX gating** only.

---

## Tests

- `lib/capability-resolution.test.ts` — resolution rules
- `lib/capabilities.test.ts` — store-backed helpers
- `lib/require-capabilities.test.ts` — route guard redirect behavior

Run: `pnpm exec nx run web:test`

# Runtime capability keys only (frontend)

Enterprise authorization on the web shell uses **one language**: Cerbos/runtime capability key strings carried on the principal (`attributes.capabilities`). UX gates mirror PDP decisions; APIs and Cerbos remain authoritative.

## Allowed primitives

| Primitive | Use for |
|-----------|---------|
| `useCapability('um:role:create')` | Component-level boolean from principal |
| `useAnyCapability([...])` / `useAllCapabilities([...])` | OR / AND checks |
| `<CapabilityGate capability="…">` | Hide buttons, sections, menu actions |
| `requireCapability` / `requireAnyCapability` | TanStack Router `beforeLoad` |
| `usePermissionsStore(s => s.hasCapability(...))` | Non-React loaders only |

Keys are defined in `services/web/src/lib/runtime-capability-keys.ts` and hydrated from the principal via `hydrateCapabilitiesFromPrincipal()`.

## Removed (do not reintroduce)

- UX permission maps (`permissions-map`, `/auth/permissions-map` consumers on the client)
- Feature/action tuples (`users.write`, `roles.read`)
- Module-specific helpers (`um-permissions.ts`, `canCreateRole`, `canManageAccess`)
- `permissions.store` `map` / `hasFeaturePermission`
- Read/write abstractions (`visitpadView`, `visitpadMutate`, prop-drilled `canReadRoles`)

## Patterns

### Route guard

```ts
export const Route = createFileRoute('/_authenticated/user-management/roles')({
  beforeLoad: requireAnyCapability(UM_ROLES_ADMIN_ANY),
  component: RolesPage,
});
```

### Button

```tsx
<CapabilityGate capability={UM_USER_CREATE}>
  <Button onClick={openCreate}>Add user</Button>
</CapabilityGate>
```

### Table row actions

```tsx
const mdVisitpadMutateAny = useAnyCapability(MD_VISITPAD_MUTATE_ANY);

visitpadActionsColumn({
  onEdit: setEditing,
  onDelete: setDeleting,
  disabled: busy || !mdVisitpadMutateAny,
});
```

## Navigation

Sidebar and discovery use `navigation-manifest.ts` with `requiredCapabilities` on each node. Filtering is implemented in `filter-navigation-tree.ts` (no per-module `*NavSection.tsx` files).

## Enforcement

- ESLint (`packages/eslint-config`): bans `hasFeaturePermission`, `can*` permission variables, and legacy import paths under `services/web`.
- Vitest: `services/web/src/lib/legacy-authorization-ban.test.ts` greps the tree for banned strings.
- Route tests: `services/web/src/lib/route-authorization.test.ts`.

## Migration checklist for new UI

1. Add capability keys to Cerbos policies and principal projection.
2. Add constants to `runtime-capability-keys.ts`.
3. Gate routes with `requireCapability` / `requireAnyCapability`.
4. Gate components with `CapabilityGate` or `useCapability` — never prop-drill booleans.
5. Add manifest `requiredCapabilities` for new nav entries.
6. Seed dev users with `pnpm seed:user-management-dev` for local testing.

See also: [capability-key-first.md](./capability-key-first.md), [navigation manifest](../frontend/navigation-manifest.md).

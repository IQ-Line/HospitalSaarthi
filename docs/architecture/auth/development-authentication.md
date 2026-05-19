# Development authentication

Production and development use the **same authorization path**. There are no client-side permission maps, synthetic capability sets, or `dev-token` bypasses.

## Flow (all environments)

```
better-auth sign-in (email/password)
  → JWT (iq_tenant_id, roles, sub)
  → GET /api/user-management/auth/principal
  → principal.attributes.capabilities[]
  → Zustand permissions store (UX gating only)
  → Cerbos PDP on every protected API
```

The SPA never calls `GET /auth/permissions-map` (removed). Shell visibility uses runtime capability keys only.

## Seeding development users

Run once after migrations:

```bash
pnpm seed:user-management-dev
```

This seeds Master Data catalog, Configurator tenant modules, UM capabilities, roles, **real** `user_capabilities` grants, and better-auth accounts.

| Persona | Email | Password | Typical capabilities |
|---------|-------|----------|----------------------|
| Platform operator | `platform@hospitalsaarthi.dev` | `password` | Full seed catalog (super-admin) |
| Tenant admin | `admin@hospitalsaarthi.dev` | `password` | UM + shell / visitpad |
| Readonly | `readonly@hospitalsaarthi.dev` | `password` | Read-only UM + clinical read |
| Clinical | `clinical@hospitalsaarthi.dev` | `password` | OPD + frontdesk shell |

Stable IDs live in `packages/dev-bootstrap/src/development-seed-users.ts`.

## Local UI shortcuts

In `import.meta.env.DEV`, the login page lists the seeded users. Each button runs the same `signIn.email` + `refreshAuthorizationContext` path as manual entry — **no** `setCapabilityKeys` shortcuts.

## What was removed

| Removed | Replacement |
|---------|-------------|
| `buildDevPermissionMap` / `dev-capability-keys.ts` | Principal hydration |
| `dev-token` / fake JWT login | better-auth + seed users |
| `GET /auth/permissions-map` | `GET /auth/principal` |
| `buildUxPermissionMap` (UM module) | Runtime keys on principal |
| Duplicate `setCapabilityKeys` in layout | `refreshAuthorizationContext` only |

## Cerbos

Seed script validates Cerbos allows `user.create`, `role.create`, and `role.assign` for the platform operator principal. Policy files under `infra/cerbos/policies/` remain the PDP source of truth.

## Local setup

See [Local development](../../local-dev.md) for `make setup`, ports, and seed credentials.

## Related

- [Runtime capability keys only](../authorization/runtime-capability-keys-only.md)
- [Capability key first](../authorization/capability-key-first.md)
- [Module registration](../platform/module-registration.md)

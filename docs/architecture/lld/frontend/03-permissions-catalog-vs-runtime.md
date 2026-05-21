# Permissions: Master Data catalog vs runtime vs SPA map

> **Purpose:** Separate three layers so engineers do not confuse **seed rows in Postgres** with **what a logged-in user may do**, and document how the web app’s Zustand map will eventually align with User Management + Cerbos.
>
> **Related:** [Master Data schema — authorization boundary](../master-data/01-schema-design.md) (catalog only), [Visitpad catalog scope](./02-visitpad-catalog-global-vs-tenant.md), [ADR-0018](../../adr/0018-frontend-stack-zustand-tanstack-router.md) (frontend auth is UX).

---

## 1. Three layers

| Layer | Location | What it answers |
|--------|----------|-----------------|
| **A. Catalog (reference)** | `public.modules`, `public.permissions`, `public.module_permissions` in Master Data | “Which **modules** exist?” “Which **named permissions** can be attached to policies / roles / Cerbos?” |
| **B. Runtime grants** | User Management (assignments) + **Cerbos PDP** | “May **this principal** perform **this action** on **this resource** in **this tenant**?” |
| **C. SPA UX mirror** | [`services/web/src/stores/permissions.store.ts`](../../../services/web/src/stores/permissions.store.ts) | “Should we **show** the Add button / Visitpad nav?” (Not authoritative; backend still enforces.) |

**Critical:** Rows in `module_permissions` do **not** mean “tenant T has access.” They only mean “this permission **may** be granted to roles that reference this module.” **Per-tenant** and **per-user** answers live in layer B.

Migration `024_visitpad_templates_module_catalog` (and optional `025_visitpad_templates_catalog_manage` for a coarse `manage` slug) only touch **layer A**.

---

## 2. How global superadmin vs tenant user should work

- **Superadmin (platform):** Cerbos (or equivalent) grants `manage` or the full set of actions on Visitpad catalog resources in the **public** scope. User Management holds the role assignment.
- **Tenant user:** Same permission **slugs**, but policies are evaluated with **tenant context** (`iq_tenant_id` or Cerbos tenant attribute), often with **narrower** actions (e.g. `read` only on tenant overlay, `update` on tenant-owned rows only).

**Granting access to a tenant user** is done by **User Management** (assign role / attach permissions) and **Cerbos policies**, not by inserting extra rows into `public.module_permissions` for “that tenant.”

---

## 3. Frontend capability keys (current)

The SPA hydrates **`usePermissionsStore.capabilityKeys`** from `GET /auth/principal` → `attributes.capabilities` after login (see [`authorization-context.ts`](../../../services/web/src/lib/authorization-context.ts) and [development-authentication.md](../../auth/development-authentication.md)).

- Shell nav and routes use **`hasCapability` / `requireCapabilities`** with runtime keys (e.g. `md:visitpad:mutate:any`, `um:user:read`).
- Visitpad pages use capability keys via hooks such as [`useVisitpadCatalogPermission`](../../../services/web/src/features/visitpad/hooks/use-visitpad-catalog-permission.ts) for mutating controls.

There is no nested UX permission map or dev-only permission injection in the login path.

---

## 4. SQL appendix (catalog only, optional DBA copy-paste)

**`manage` permission + junction** (idempotent pattern; adjust UUIDs if they collide in your fork):

```sql
-- Permission: full catalog manage (Cerbos policy typically maps "manage" to all effects)
INSERT INTO public.permissions (id, name, slug, action, description, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(),
       'Visitpad templates catalog manage',
       'visitpad-templates-catalog-manage',
       'manage',
       'Full Visitpad templates catalog (platform or tenant scope per Cerbos).',
       true, false, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions WHERE slug = 'visitpad-templates-catalog-manage' AND NOT is_deleted
);

-- Junction: link to module id from migration 024 (visitpad-templates)
INSERT INTO public.module_permissions (id, slug, module_id, permission_id, is_default, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(),
       'visitpad-templates-catalog-manage',
       m.id,
       p.id,
       false, true, false, now(), now()
FROM public.modules m
JOIN public.permissions p ON p.slug = 'visitpad-templates-catalog-manage' AND NOT p.is_deleted
WHERE m.slug = 'visitpad-templates' AND NOT m.is_deleted
  AND NOT EXISTS (
    SELECT 1 FROM public.module_permissions mp
    WHERE mp.slug = 'visitpad-templates-catalog-manage' AND NOT mp.is_deleted
  );
```

**Granular option (example):** repeat the pattern with slugs like `visitpad-units-read`, `visitpad-units-update`, each `INSERT` into `permissions` then `module_permissions` to the same `modules` row. Cerbos policies then reference those slugs for least privilege.

**Cerbos (layer B):** Catalog rows from migration `025` (or the SQL above) only **name** a permission for policies and onboarding. PDP rules must still attach that slug (or `024` read/update slugs) to principals and resource kinds; nothing in `public.permissions` grants access by itself.

---

## 5. Hydrating layer C (implemented)

After better-auth login, the SPA calls **`GET /auth/principal`** and sets capability keys via `hydrateCapabilitiesFromPrincipal()` (see [`permissions.ts`](../../../services/web/src/lib/permissions.ts)). Development uses the same path with seeded users (`pnpm seed:user-management-dev`); see [development-authentication.md](../../auth/development-authentication.md).

---

## 6. Verification checklist

- Catalog rows exist in DB (layer A) but **do not** automatically populate the SPA; principal hydration does (layer C).
- Readonly seed user (`readonly@hospitalsaarthi.dev`): UM read keys present; mutating UM UI hidden when keys are absent.
- Platform operator seed user: broad capability set from `user_capabilities`; same principal path as production.

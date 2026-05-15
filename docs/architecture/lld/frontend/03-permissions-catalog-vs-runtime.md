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

## 3. Frontend map shape (phase 0)

The store uses nested keys: `map[moduleKey][featureKey][actionKey] → boolean`.

- **Module key** for Visitpad templates UI: `visitpad-templates` (matches sidebar [`_authenticated.tsx`](../../../services/web/src/routes/_authenticated.tsx)).
- **Feature key (coarse):** `catalog` — covers list + all Visitpad template sections until finer keys are added.
- **Action keys:** `read`, `write` (UI shorthand). **`write`** is the projection used for create/update/delete in the UI; it should align with Cerbos `update` / `create` / `delete` / `manage` when the real API is wired.

Helper: [`services/web/src/lib/permissions-map.ts`](../../../services/web/src/lib/permissions-map.ts) — `projectCerbosActionsToWrite`, `buildDevPermissionMap`.

Visitpad pages use [`useVisitpadCatalogPermission`](../../../services/web/src/features/visitpad/hooks/use-visitpad-catalog-permission.ts) to gate **mutating** controls (Add, bulk CSV, row edit/delete, toggles use `write`). **Import from library** (tenant overlay only) is shown when the user has **catalog `read`** so tenant demos can pull platform rows while Add stays hidden if `write` is false.

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

## 5. Future User Management API (hydrate layer C)

**Goal:** After better-auth (or BFF) login, call User Management (or BFF aggregate) to obtain **effective permissions** for the current user and tenant, then `usePermissionsStore.getState().setPermissions(map)`.

**Illustrative response shape** (normative contract TBD in OpenAPI):

```json
{
  "version": 1,
  "modules": [
    {
      "module": "visitpad-templates",
      "features": [
        {
          "feature": "catalog",
          "actions": ["read", "update"]
        }
      ]
    }
  ]
}
```

**Client mapping steps:**

1. For each module, for each feature, normalize Cerbos/API actions with [`projectCerbosActionsToWrite`](../../../services/web/src/lib/permissions-map.ts) into `{ read: boolean, write: boolean }`.
2. Build nested `PermissionMap` and call `setPermissions(map)`.
3. Call from a single place (e.g. post-login callback, session refresh) so dev mock and production paths stay parallel.

Until that API exists, [`buildDevPermissionMap`](../../../services/web/src/lib/permissions-map.ts) + [`login.tsx`](../../../services/web/src/routes/login.tsx) supply layer C for local development.

---

## 6. Verification checklist

- Catalog rows exist in DB (layer A) but **do not** automatically populate the SPA; login mock or UM API does (layer C).
- Tenant dev login with read-only Visitpad: lists still load if backend allows; **mutating** UI is disabled when `write` is false.
- Superadmin dev login: `write` true for `visitpad-templates.catalog`; full Visitpad editing in the UI (subject to catalog scope / `iq_tenant_id` rules in [02](./02-visitpad-catalog-global-vs-tenant.md)).

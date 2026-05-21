# PR: Platform E2E authorization & catalog alignment

## Summary

Unifies frontend authorization on **runtime capability keys** and Master Data catalog slugs, aligns assignable capabilities with active `module_permissions`, and separates schema migration from dev platform bootstrap.

### Capability / Master Data alignment

- **User Management** `listAssignableRuntimeCapabilities` filters LOB capabilities via `listActiveModulePermissionSourcePairs` + `filterRuntimeCapabilitiesByMasterDataLinks` (platform modules stay fully assignable).
- HTTP adapter caches MD catalog lookups (5 min TTL) with explicit `invalidateModuleSlugMapCache()`.
- Role editor / tenant wizard only show permissions still linked in Master Data.

### CRUD gating refactor

- **`useCatalogModuleCrud`** + **`catalogModuleCrudAccess`**: per-action `canRead` / `canCreate` / `canUpdate` / `canDelete` (shell access grants read only, not create).
- Replaces removed `*-permissions.ts` helpers and `canWriteBillingServices`.
- **`legacy-authorization-ban.test.ts`** blocks reintroduction of tuple maps and feature permission modules.

### Visitpad access

- Nav/route gates use catalog module segments + restored **`principalHasProductWideNavCapability`** for `visitpad-templates:visitpad:view|create`.
- Manifest-driven tabs and landing routes; global vs tenant catalog reads via `apiClientGlobalCatalogRead` / `tenantIdOverride: null`.

### Registration & web stack

- `dev:web-stack` includes **registration-svc**; registration API paths get `iq_tenant_id` via `api-client`.
- EMPI dev placeholder remapped to bootstrap tenant for billing in dev.

### Migrations & seed

- **Master Data**: `034_product_l2_catalog_modules` (merge of `033` + `030`; replaces retired `035` — see `fix_alembic_035_stamp.py`).
- **User Management**: `db-migrate` is **schema-only**; platform bootstrap moved to `user-management:seed-platform` / `pnpm seed`.
- Removed comment-only `0004_dev_platform_bootstrap.sql`.

### Supersedes PR #101

This branch includes PR #101 scope:

- `BILLING_TARIFF_*` constants in `runtime-capability-keys.ts`
- Deleted `billing-services-permissions.ts` / `use-billing-services-permission.ts`
- Authorization-ban regression coverage

## Test plan

- [ ] `pnpm nx run master-data:migrate` (single head: `034_product_l2_catalog_modules`)
- [ ] `pnpm nx run user-management:db-migrate` then `pnpm seed:platform` (or `pnpm seed`)
- [ ] `pnpm --filter @hims/web test` — nav, visitpad access, api-client billing headers, CRUD gating
- [ ] `pnpm nx run user-management:test` — MD source-pair filter
- [ ] Sign in as platform operator; verify visitpad shell + L2-only roles, tariff create hidden without create key
- [ ] Role editor omits permissions removed from Master Data `module_permissions`

## Merge notes (PR #84 / #103)

If another branch adds `034_*` or `035_product_l2_catalog_modules`:

1. Keep **this** `034_product_l2_catalog_modules` revision id (canonical billing/frontdesk L2 tree).
2. Re-stamp DBs that applied `035` using `modules/master-data/scripts/fix_alembic_035_stamp.py`.
3. Resolve Alembic graph so `down_revision` remains `(033_picklist_values_seed, 030_demo_authorization_catalog)`.

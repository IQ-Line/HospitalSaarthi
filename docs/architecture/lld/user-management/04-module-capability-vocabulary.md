# User Management — module & capability vocabulary

Pre-production alignment between **Master Data**, **Configurator**, **User Management (UM)**, and **Cerbos**.

> **Runtime capability key format** (`um:user:create`, etc.): see [runtime-capability-vocabulary.md](./runtime-capability-vocabulary.md) and the [vocabulary audit](./runtime-capability-vocabulary-audit.md).

> **Superseded 2026-07-09 (issue #60, Phase 1.5):** the "stored grants" row below describes `user_capabilities` as PR #56's copy-on-apply snapshot. As of [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md), `user_capabilities` holds per-user grant/deny **overrides only**; the base capability set comes from a live `user_roles ⨝ role_capabilities` join, not a snapshot. `effective_capabilities` (below) is now `(live-join base ∪ grant overrides − deny overrides ∪ delegated) ∩ tenant_entitlement`, still per ADR-0032 for the tenant-entitlement half. Left as-is below for historical trace of the Phase 1 design.

## Authority boundaries

| System | Owns | Does not own |
|--------|------|----------------|
| **Master Data** | Module catalog (`modules.slug`), permission catalog (`permissions.slug`), `module_permissions` | Runtime grants, tenant enablement, Cerbos decisions |
| **Configurator** | Tenant module enablement (`tenant_modules.module_id`, `is_active`) | Permissions, runtime capabilities, Cerbos keys |
| **User Management** | Runtime capabilities, role/user grants, Cerbos principal vocabulary | Module catalog truth, tenant enablement rows |
| **Cerbos** | Policy decisions over UM `capability_key` strings | Catalog data, tenant modules |

## Canonical terms (use in code & APIs)

| Term | Meaning | Example |
|------|---------|---------|
| **module slug** | Kebab-case id from `master_data.modules.slug` | `user-management`, `opd`, `billing` |
| **tenant-enabled modules** | Configurator rows for a tenant | `tenant_modules` where `is_active = true` |
| **runtime capability** | UM `capabilities` row (machine + display fields) | `um:user:read` |
| **capability key** | Cerbos / PDP string on principal | `um:user:read` |
| **assignable capability** | Runtime capability allowed for role composition for a tenant | Filtered via `GET /capabilities/assignable` |
| **tenant entitlement** | Capability keys operable for a tenant at runtime | Same resolution as assignable catalog (ADR-0032) |
| **stored grants** | Persisted UM snapshot rows | `user_capabilities`, `delegated_capability_grants` |
| **effective capabilities** | Runtime Cerbos/SPA keys | `stored_grants ∩ tenant_entitlement` at principal hydration |

Avoid ambiguous names in UM (`permission list`, `role permission`, `entitlement permission`) unless referring explicitly to **Master Data** catalog APIs.

## Field alignment

### `capabilities.module`

**MUST** equal `master_data.modules.slug` (normalized lowercase kebab-case).

Examples: `user-management`, `configurator`, `opd`, `billing`.

Helpers: `normalizeModuleSlug`, `isValidModuleSlug` in `@hims/user-management`.

### Configurator → Master Data → UM

1. Configurator returns **tenant-enabled** `module_id` UUIDs.
2. Master Data resolves `module_id` → **module slug**.
3. UM filters **runtime capabilities** where `capabilities.module` is in that slug set (plus platform runtime modules).

Configurator does **not** return permissions; UM does not read Configurator for capability rows.

### Cerbos

Policies reference **capability keys** (e.g. `um:user:read`). These are stable once granted. Renaming catalog slugs in Master Data does not automatically change Cerbos keys.

## Assignable filtering (why it lives in UM)

`GET /api/user-management/capabilities/assignable`:

- Calls Configurator (tenant-enabled modules) and Master Data (slug map).
- Returns UM **runtime capabilities** only.
- Fails closed (`503 MODULE_ENTITLEMENT_LOOKUP_FAILED`) if either upstream is unavailable.

`GET /capabilities` remains the full global runtime catalog (admin/diagnostics).

### Failure behavior (tenant safety)

- **No fallback to full catalog** when Configurator or Master Data errors: assignable resolution aborts.
- **No silent dropping** of tenant-enabled module ids: if Master Data cannot resolve **every** Configurator `module_id` to a kebab-case slug, UM treats the catalog response as unusable and fails closed (same HTTP code family as upstream outage).
- **Invalid slugs** from Master Data (not lowercase kebab-case) fail closed — UM does not “guess” by ignoring them.
- **Writes** (`PUT /roles/{id}/capabilities`, `PUT /users/{id}/capabilities`, role-template application paths, and direct grants on user create) validate against the same assignable capability set **before** persisting; partial writes are not applied when validation fails early. (Template application after a user row exists is still a single HTTP operation from the client’s perspective; clients should treat non-2xx as “nothing to rely on” and re-fetch.)

### Platform runtime modules (`PLATFORM_RUNTIME_MODULE_SLUGS`)

A **small fixed allowlist** (`user-management`, `configurator`) is **always** unioned into the assignable slug set so core platform composition remains possible even when a tenant has **zero** Configurator `tenant_modules` rows.

- These MUST be true platform infrastructure modules — not clinical/line-of-business modules.
- Use `isPlatformRuntimeModuleSlug()` for membership checks; do not pattern-match or wildcard platform behavior.

### Runtime vocabulary vs catalog permissions

- **`capabilities` rows** in UM are the **global runtime vocabulary** (including `capability_key` strings consumed by Cerbos).
- **`user_roles`** records which **role templates** are applied to a user. **Runtime grants** materialize in `user_capabilities` on apply (snapshot-at-write). See [ADR-0031](../../adr/0031-um-role-template-snapshot-semantics.md). Until issue #60, PEP reads may temporarily union live `role_capabilities` — not the long-term model.
  **Superseded 2026-07-09:** issue #60 landed — see [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md). PEP reads are now a live `user_roles ⨝ role_capabilities` join by design (not a temporary union), with `user_capabilities` narrowed to grant/deny overrides only; there is no more snapshot-at-write for role-derived grants.
- **Master Data `permissions.slug`** values are **catalog documentation** for product/modules; they are **not** Cerbos runtime keys until UM maps them into stable `capability_key` rows (future MD → UM sync only).
- **Configurator** answers **only** “which `module_id`s are enabled for this tenant?” — never runtime capability truth.

### Assignable resolution flow (module_id → slug)

1. Configurator: `GET /tenants/{tenantId}/modules?is_active=true` → list of `module_id` UUIDs.
2. Master Data: resolve each `module_id` → `modules.slug` (normalized kebab-case).
3. UM: `assignable_module_slugs = platform_allowlist ∪ resolved_slugs`.
4. UM: `SELECT` active capabilities where `capabilities.module IN assignable_module_slugs`.

### Future catalog sync (not implemented)

Nullable provenance on `user_management.capabilities`:

- `source_module_slug`
- `source_permission_slug`
- `source_catalog` (`master_data`)

Reserved for future MD → UM ingestion. No sync, projections, or events in Phase 0.

## Integration ports (UM)

| Port | Upstream | Method |
|------|----------|--------|
| `TenantModuleEntitlementPort` | Configurator | `listTenantEnabledModuleIds` |
| `MasterDataModuleCatalogPort` | Master Data | `resolveModuleSlugsByIds` |

HTTP adapters live in `user-management-svc` (`CONFIGURATOR_URL`, `MASTER_DATA_URL`).

## Related APIs

| API | Vocabulary |
|-----|------------|
| Master Data `GET /modules` | module catalog |
| Master Data permissions APIs | **permissions** (catalog only) |
| Configurator `GET /tenants/{id}/modules` | tenant-enabled modules |
| UM `GET /capabilities` | full runtime capability catalog |
| UM `GET /capabilities/assignable` | assignable runtime capabilities |
| UM `PUT /roles/{id}/capabilities` | role runtime capability grants |

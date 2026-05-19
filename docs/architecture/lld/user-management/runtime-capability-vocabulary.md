# Runtime capability vocabulary (canonical)

Canonical **runtime** authorization strings used by User Management, Cerbos, and the admin UI. This is separate from Master Data **`permissions.slug`** (catalog documentation).

See also: [04-module-capability-vocabulary.md](./04-module-capability-vocabulary.md) (authority boundaries), [runtime-capability-vocabulary-audit.md](./runtime-capability-vocabulary-audit.md) (audit & rollout).

## Canonical format

```
<moduleKey>:<resource>:<action>
```

| Segment | Meaning | Rules |
|---------|---------|--------|
| **moduleKey** | Runtime PDP namespace prefix | Lowercase kebab-case; may differ from `capabilities.module` |
| **resource** | Resource within the module | Lowercase kebab-case; prefer **singular** for new modules |
| **action** | Operation | Lowercase; from allowed action set |

### Examples (target standard)

| capability_key | `capabilities.module` (MD slug) | Notes |
|----------------|----------------------------------|--------|
| `um:user:create` | `user-management` | Platform abbreviation `um` |
| `um:role:assign` | `user-management` | |
| `opd:registration:create` | `opd` | moduleKey = catalog slug |
| `visitpad:template:read` | `visitpad` | |
| `billing:invoice:update` | `billing` | |

## Syntax rules

- **Lowercase only** — enforced in DB (`capabilities_key_canonical_chk`) and `normalizeCapabilityKey()`.
- **Colon-separated** — exactly **three** segments; no dots, no slashes.
- **Kebab-case segments** — `[a-z0-9]+(-[a-z0-9]+)*` per segment.
- **No wildcards** — explicit keys only.
- **Stable once granted** — renaming requires migration + Cerbos policy update.

## Allowed actions (third segment)

`assign`, `compose`, `create`, `deactivate`, `delete`, `manage`, `read`, `update`, `view`

- UM foundational seeds use: `create`, `read`, `update`, `deactivate`, `assign`.
- `view` is reserved for legacy / Master Data alignment (e.g. visitpad catalog); prefer `read` for new capabilities.
- Cerbos **resource actions** (e.g. `user.read`, `role.delete`) are a different layer — do not confuse with capability_key action segments.

## Module naming

### `capabilities.module`

Must equal **`master_data.modules.slug`** (kebab-case): `user-management`, `opd`, `billing`, etc.

### Runtime `moduleKey` (first segment of `capability_key`)

| Catalog slug (`capabilities.module`) | Runtime `moduleKey` |
|--------------------------------------|---------------------|
| `user-management` | `um` |
| *(all other slugs)* | same as catalog slug |

Configured in `RUNTIME_MODULE_KEY_BY_CATALOG_SLUG` (`@hims/user-management`).

## Resource naming

- **New modules:** use **singular** resource segments (`registration`, `invoice`, `template`).
- **User Management (legacy):** keys use singular resource (`user`, `role`, `capability`) while `capabilities.feature` may be plural (`users`, `roles`) — **do not** enforce feature ↔ key segment equality on existing rows.
- Avoid ambiguous resources (`data`, `item`, `resource`).

## Reserved prefixes

| Prefix | Usage |
|--------|--------|
| `um` | User Management platform module |
| `md` | Reserved — legacy Cerbos visitpad policy namespace (`md:visitpad:*`); not UM catalog |

Do not allocate new top-level prefixes without architecture review.

## Validation (code)

| Helper | Purpose |
|--------|---------|
| `normalizeCapabilityKey()` | Lowercase trim |
| `parseCapabilityKey()` | Split + validate segments |
| `assertValidCapabilityKey()` | Fail on malformed keys |
| `assertCapabilityKeyMatchesCatalogModule()` | moduleKey ↔ `capabilities.module` |
| `assertValidRuntimeCapabilityRow()` | Full row (key + module + action column) |
| `findDuplicateCapabilityKeys()` | Duplicate detection after normalization |

Startup: `validateRuntimeAuthorizationStartup()` scans all catalog rows.

Repository: `rowToCapability()` validates on read (fail-closed).

## Master Data → runtime mapping (future sync)

Master Data **`permissions.slug`** is **not** a Cerbos key. Future sync uses:

```typescript
mapMasterDataPermissionToRuntimeCapability({
  moduleSlug: "opd",
  permissionSlug: "registration.create",
});
// → { capability_key: "opd:registration:create", module: "opd", ... }
```

Convention: `permissionSlug` = `<resource[.<nested>…]>.<action>` (dot-separated), mapped to `moduleKey:resource:action`.

Provenance columns (`source_module_slug`, `source_permission_slug`, `source_catalog`) record MD origin.

## Cerbos alignment

- UM policies reference **runtime** keys (`um:user:read`, etc.) in `request.principal.attr.capabilities`.
- Policy **actions** remain dotted (`user.read`, `role.create`) — mapped from HTTP handlers, not from capability_key strings.
- Principals never query Master Data at decision time.

## Frontend alignment

- Shell gating uses **`GET /auth/permissions-map`** → `module → feature → { read, write }` (UX only).
- Module id in the map is the **catalog slug** (`user-management`), not `um`.
- Capability keys appear in admin UI for display; route gating does **not** hardcode `um:*` strings today.

## Backward compatibility

- Existing UM seeds and Cerbos UM policies **already conform** to `um:<resource>:<action>`.
- No `capability_key` renames in this phase.
- Invalid **new** rows fail at startup and on repository read.

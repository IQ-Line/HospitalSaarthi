# Runtime capability vocabulary — alignment audit

**Date:** 2026-05-17  
**Scope:** UM `capabilities.capability_key`, Cerbos policy references, frontend UX permissions, future MD → UM sync mapping.  
**Out of scope:** Master Data `permissions.slug` migration, Configurator, entitlement architecture changes.

## Executive summary

User Management foundational runtime capabilities **already follow** the target canonical format `<moduleKey>:<resource>:<action>` with platform prefix `um` for `user-management`. Cerbos UM policies are **aligned** with seeded keys. Gaps are mainly **documentation**, **cross-column drift** (feature vs key resource segment), **visitpad legacy `md:` namespace** in Cerbos, and missing **programmatic validation** (now added).

**Recommendation:** No `capability_key` renames or Cerbos UM policy rewrites in this phase. Add validation + mapping helpers + docs; defer visitpad namespace alignment and optional `um:role:delete` capability.

---

## 1. Audit: existing `capability_key` values

### User Management seeds (`0002_capability_catalog_seed.sql`)

| capability_key | module | feature | action | Verdict |
|----------------|--------|---------|--------|---------|
| `um:user:create` | user-management | users | create | Canonical |
| `um:user:read` | user-management | users | read | Canonical |
| `um:user:update` | user-management | users | update | Canonical |
| `um:user:deactivate` | user-management | users | deactivate | Canonical |
| `um:role:read` | user-management | roles | read | Canonical |
| `um:role:create` | user-management | roles | create | Canonical |
| `um:role:update` | user-management | roles | update | Canonical |
| `um:role:assign` | user-management | roles | assign | Canonical |
| `um:capability:read` | user-management | capabilities | read | Canonical |

**Count:** 9 foundational keys; all lowercase; three segments; `um` prefix consistent.

### TypeScript constants (`user-management-capabilities.ts`)

Mirrors seeds exactly — single source of truth for code references.

### Tests & OpenAPI examples

- Tests overwhelmingly use `um:*` for UM and `opd:visit:read`, `empi:patient:read`, `billing:invoice:read` for entitlement fixtures (valid forward-looking examples).
- OpenAPI assignable example documents `um:user:read` + `opd:visit:read`.

### Inconsistencies identified

| Issue | Severity | Notes |
|-------|----------|-------|
| **moduleKey vs `capabilities.module`** | Documented | `um` ↔ `user-management` is intentional abbreviation, not drift |
| **resource vs `feature` column** | Low (legacy) | Keys use `user` / `role`; features use `users` / `roles` — acceptable for UM; do not enforce equality on legacy rows |
| **action `deactivate`** | Low | Valid runtime action; not in all style guides — listed in allowed set |
| **No `um:role:delete`** | Medium (gap) | Cerbos `role.delete` allowed with `um:role:update` only — see Cerbos section |
| **Plural resources in tests only** | Low | `opd:visit:read` uses singular `visit` — good pattern for new modules |

### Collision risks

| Risk | Mitigation |
|------|------------|
| New module slug `um` | Reserved prefix list; catalog slug validation separate |
| Duplicate keys after case fold | DB unique on `capability_key`; startup `findDuplicateCapabilityKeys()` |
| `md:` vs `visitpad:` for visitpad | Document reserved `md` legacy; future keys should use `visitpad:` per target standard |

---

## 2. Canonical standard (adopted)

See [runtime-capability-vocabulary.md](./runtime-capability-vocabulary.md).

**Format:** `<moduleKey>:<resource>:<action>`

**Implementation:** `modules/user-management/src/domain/capability-key.ts`

---

## 3. Cerbos policy audit (`infra/cerbos/policies/**`)

### User Management policies — aligned

| Policy file | capability keys referenced | Match UM seeds? |
|-------------|---------------------------|-----------------|
| `user_management/user.yaml` | `um:user:create/read/update/deactivate` | Yes |
| `user_management/role.yaml` | `um:role:read/create/update` | Yes |
| `user_management/user_role_template.yaml` | `um:role:assign` | Yes |
| `user_management/capability.yaml` | `um:capability:read` | Yes |
| `user_management/auth.yaml` | *(none — tenant only)* | N/A |

Tests under `infra/cerbos/tests/*` use the same strings — consistent.

### Gaps (no policy rewrite in this phase)

| Finding | Detail | Recommendation |
|---------|--------|----------------|
| **`role.delete` without `um:role:delete`** | `role.yaml` bundles `role.delete` under `um:role:update` | Document; add `um:role:delete` only if product wants delete separated from update |
| **`role.compose` action** | Gated by `um:role:update` | OK — compose is Cerbos action name, not capability_key |

### Visitpad policy — namespace mismatch

**File:** `infra/cerbos/policies/master_data_visitpad.yaml`

| Policy capability strings | Target canonical would be |
|---------------------------|---------------------------|
| `md:visitpad:create` | `visitpad:<resource>:create` |
| `md:visitpad:update` | `visitpad:<resource>:update` |
| `md:visitpad:delete` | `visitpad:<resource>:delete` |
| `md:visitpad:view` | `visitpad:<resource>:read` (action naming) |

**Issues:**

- Uses `md` module prefix (reserved / legacy Master Data namespace).
- Resource segment is `visitpad` (module name repeated inside key).
- Action `view` vs canonical `read`.

**Not in UM capability catalog today** — policies are forward-looking. **Do not rewrite** until visitpad capabilities are seeded in UM and principals carry keys.

**Orphan risk:** If UM seeds `visitpad:*` keys but Cerbos still checks `md:visitpad:*`, authorization would deny.

---

## 4. Frontend audit

### Hardcoded `um:*` strings

**None** in route gating. UI uses:

- `hasFeaturePermission('user-management', '<feature>', 'read'|'write')` via permissions map.
- `UM_MODULE = 'user-management'` in `um-permissions.ts`.

### Permissions map shape

`buildUxPermissionMap()` derives `user-management.users.read/write` from Cerbos checks on actions `user.read`, `user.create`, etc. — **not** from parsing `capability_key` strings.

| UX feature | Backing Cerbos checks | Related capability keys (indirect) |
|----------|----------------------|-----------------------------------|
| `users.read` | `user.read` | `um:user:read` |
| `users.write` | create/update/deactivate | `um:user:create`, etc. |
| `roles.read` | `role.read` | `um:role:read` |
| `roles.write` | create/update/delete | `um:role:create`, `um:role:update` |
| `userAccess.write` | `role.assign`, `role.revoke` | `um:role:assign` |

### Migration risks

| Risk | Impact |
|------|--------|
| Renaming `um:*` keys | Break Cerbos + all grants; high |
| Changing `capabilities.module` without updating moduleKey map | Startup validation fails (new) |
| Visitpad UI module `visitpad-templates` vs slug `visitpad` | UX map module name ≠ catalog slug — document for visitpad workstream |
| Frontend assuming `write` in capability_key | False — uses projected read/write from Cerbos actions only |

---

## 5. Future MD sync compatibility

| Master Data | User Management runtime |
|-------------|-------------------------|
| `modules.slug` | `capabilities.module` |
| `permissions.slug` (e.g. `registration.create`) | `capability_key` via `mapMasterDataPermissionToRuntimeCapability()` |
| — | `source_*` provenance columns |

**Example mapping:**

```
MD:  module=opd, permission=registration.create
UM:  capability_key=opd:registration:create, module=opd
```

**Not implemented:** sync job, event bus, or runtime MD queries.

---

## 6. Implementation delivered (minimal safe alignment)

| Deliverable | Location |
|-------------|----------|
| Validation helpers | `capability-key.ts` |
| MD → runtime mapper (future sync) | `map-master-data-permission.ts` |
| Startup validation extension | `validate-runtime-authorization.ts` |
| Repository read validation | `capability-repository.ts`, `in-memory-capability-repository.ts` |
| Unit tests | `capability-key.test.ts`, `map-master-data-permission.test.ts` |
| Vocabulary spec | `runtime-capability-vocabulary.md` |
| `InvalidCapabilityKeyError` | `errors.ts` |

**Not changed:** SQL seeds, Cerbos YAML, frontend permission checks, Configurator.

---

## 7. Safe rollout strategy

1. **Deploy** validation + docs (this change) — existing catalog passes validation.
2. **CI:** run UM tests + Cerbos compile/tests on PRs.
3. **New modules:** enforce vocabulary at capability insert time (validation helpers + code review).
4. **Visitpad:** when adding UM capabilities, choose either migrate Cerbos to `visitpad:*` or seed matching `md:visitpad:*` keys — single coordinated release.
5. **Optional:** add `um:role:delete` capability + policy split if product requires distinct delete permission.

---

## 8. Backward compatibility

| Area | Status |
|------|--------|
| Existing grants | Unchanged |
| Cerbos UM policies | Unchanged |
| DB schema | Unchanged (constraints already require lowercase keys) |
| API responses | Still return `capability_key` as stored |
| Invalid legacy rows | Would fail startup/read (none in foundational catalog) |

---

## 9. Cerbos alignment notes

- **Principal attributes** carry runtime `capability_key` strings from UM DB — policies must match exactly.
- **Cerbos resource actions** (`user.read`) are the HTTP/authz layer; keep mapping tables in authz resolver documented separately.
- **Delegated capabilities** use the same string namespace as direct capabilities.
- **Tests** are the contract for UM policies — keep synchronized when adding keys.

---

## 10. Remaining future work

- [ ] Visitpad: align `md:visitpad:*` Cerbos strings with UM `visitpad:*` catalog rows
- [ ] Optional `um:role:delete` capability vs bundled `um:role:update`
- [ ] MD → UM sync job using `CapabilityCatalogSyncPort` + `mapMasterDataPermissionToRuntimeCapability()`
- [ ] Stricter optional validator: feature column ↔ key resource segment for **new** capabilities only
- [ ] Configurator / platform module runtime keys when `configurator:*` capabilities are introduced

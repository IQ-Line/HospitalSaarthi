# Configurator Cerbos PEP — implementation plan (2026-07-07)

> **Scope decision (user, 2026-07-07):** Option **A — full Cerbos PEP** (over the module-vet
> adversary's "role gates are enough" position). Rationale: honoring the platform doctrine
> *"no role-only grants — even super-admin carries the capability"* requires principal enrichment
> under either option; once enriched, calling the single PDP is a tiny marginal step that yields
> declarative, auditable, platform-consistent authz instead of hand-rolled capability checks.
> This is the last open Phase-4 (authz rebuild) cleanup item; the TS-side analogue of the #51
> Python PEP (opd + master-data).

## The shape in one line
Configurator is the **only** HIMS service with authn (`identityPlugin`) but **no Cerbos PEP**.
Billing / pharmacy / registration / user-management already run the exact stack
`identityPlugin → principalRoleEnricherPlugin → authzPlugin({resolveTarget})` with `authMode:'protected'`
routes + a module-owned target-resolver. This task brings configurator to that parity. **~90% reuse;
new = one resolver + per-route flags + main.ts wiring + a `configurator` Cerbos policy set + a
capability-seed migration + tests + a live round-trip.**

## Key facts established during recon (do not re-derive)
- **PEP stack is reuse, not build.** `@hims/ts-sdk-authz` `authzPlugin` (Cerbos check + 403 + decision
  cache + onReady mapping-completeness probe), `assertCerbosReachable`, `@hims/ts-sdk-identity`
  `identityPlugin`/`validateAuthConfig`, and `@hims/user-management` `principalRoleEnricherPlugin` +
  `createPepRuntimeAuthFromUrls` + the 4 Drizzle repos all exist and are battle-tested by 4 services.
  Copy-template: `services/billing-svc/src/main.ts`.
- **Enricher DB coupling is a non-issue.** `packages/ts-sdk-db/src/database-isolation.ts` proves
  configurator + user_management are **schemas on the SAME shared operational DB** (`hims_dev`).
  `assertConfiguratorDatabaseIsolation` only checks the `configurator` schema exists. So configurator-svc's
  existing `DATABASE_URL` already reaches the `user_management` schema — the DB-backed enricher wires
  verbatim with the *same* connection (`const umDb = createDb(resolveDatabaseUrl())`), zero new plugin code.
- **Capability propagation to super-admin is catalog-driven and automatic.**
  `syncSuperAdminCapabilitySnapshots` (UM dev) grants **every active catalog capability** to the
  super-admin role + refreshes `user_capabilities` (the PEP reads snapshots). Seeding `configurator:*`
  into the master-data catalog flows to super-admin with no per-module code — same chain #51 used.
- **Exact capability-key mapper** (`modules/user-management/src/domain/map-master-data-permission.ts`):
  catalog permission slug → `<moduleSlug>:<feature>:<action>`; drops the leading module segment, joins
  middle segments with `-`, action = last segment. `assertValidModuleSlug` is **format-only** (kebab),
  so `configurator` is valid; the configurator module row slug is `configurator` (seeded by `027`,
  confirmed line 40/247). Allowed actions include create/read/update/delete.
  - `configurator.organization.create` → `configurator:organization:create`
  - `configurator.tenant.module.create` → `configurator:tenant-module:create`
  - `configurator.tenant.integration.profile.create` → `configurator:tenant-integration-profile:create`
  - `configurator.tenant.api.key.create` → `configurator:tenant-api-key:create`
  - `configurator.sequence.configuration.update` → `configurator:sequence-configuration:update`
- **Cerbos naming precedent** (`master_data/module.yaml`): resource `kind` uses the policy's own
  namespace; the *condition* checks the runtime capability key in `request.principal.attr.capabilities ||
  request.principal.attr.delegated_capabilities`. For configurator (single-word slug) both use
  `configurator:` — no hyphen/underscore mismatch. Pattern to copy is `master_data/module.yaml`:
  `roles:["*"]`, capability-membership condition, **NO tenant-equality** (platform-operator scoped).
- **`046_master_data_authorization_catalog` is the alembic head** → new `047_configurator_authorization_catalog`
  revises it, mirroring the 045/046 seed shape (INSERT … WHERE NOT EXISTS into `master_global.permissions`
  + `master_global.module_permissions`, joining `m.slug='configurator'`).

## Route inventory + classification (authoritative, from `specs/openapi/configurator.v1.yaml`)
Principle: **capability-gate every current `assertPlatformSuperAdmin` route + every currently-UNGUARDED
mutation route (close the holes); keep the existing public tenant-catalog reads public; keep internal
S2S routes on their internal-key gate.** Post-prefix paths (`/api/configurator/v1` stripped).

**PROTECTED (Cerbos, `authMode:'protected'`):**
| Method + path | kind | action | today |
|---|---|---|---|
| POST /organizations | configurator:organization | create | super-admin |
| GET /organizations | configurator:organization | read | (gated) |
| GET /organizations/:id | configurator:organization | read | (gated) |
| PATCH /organizations/:id | configurator:organization | update | **UNGUARDED** |
| POST /tenants | configurator:tenant | create | **UNGUARDED** |
| PATCH /tenants/:id | configurator:tenant | update | **UNGUARDED** |
| POST /tenants/:tid/modules | configurator:tenant-module | create | **UNGUARDED** |
| GET /tenants/:tid/modules/:mid | configurator:tenant-module | read | (gated) |
| PATCH /tenants/:tid/modules/:mid | configurator:tenant-module | update | super-admin |
| DELETE /tenants/:tid/modules/:mid | configurator:tenant-module | delete | super-admin |
| GET /tenants/:tid/integration-profiles | configurator:tenant-integration-profile | read | super-admin |
| POST /tenants/:tid/integration-profiles | configurator:tenant-integration-profile | create | super-admin |
| GET /tenants/:tid/integration-profiles/:pid | configurator:tenant-integration-profile | read | super-admin |
| PATCH /tenants/:tid/integration-profiles/:pid | configurator:tenant-integration-profile | update | super-admin |
| DELETE /tenants/:tid/integration-profiles/:pid | configurator:tenant-integration-profile | delete | super-admin |
| GET /sequence-configurations | configurator:sequence-configuration | read | (gated) |
| GET /tenants/:tid/sequence-configuration | configurator:sequence-configuration | read | (gated) |
| PUT /tenants/:tid/sequence-configuration/identifiers/:type | configurator:sequence-configuration | update | **UNGUARDED** |
| GET /tenants/:tid/api-keys | configurator:tenant-api-key | read | **UNGUARDED** |
| POST /tenants/:tid/api-keys | configurator:tenant-api-key | create | **UNGUARDED** |
| PATCH /tenants/:tid/api-keys/:kid | configurator:tenant-api-key | update | **UNGUARDED** |
| POST /branding-logos/organization | configurator:branding | create | super-admin |
| POST /branding-logos/tenant | configurator:branding | create | **UNGUARDED** |
| POST /tenant-onboarding | configurator:tenant-onboarding | create | super-admin OR org-scoped |

**PUBLIC (no PEP — keep current behavior; BFF/web/integration-hub consume without a bearer):**
`GET /tenants`, `GET /tenants/:id`, `GET /tenants/:tid/modules`, `GET /branding-logos/ready`,
`GET /branding-logos/download`, plus `/healthz`, `/docs`.

**INTERNAL S2S (no PEP — keep internal-key gate + identity-skip; never `authMode:'protected'`):**
`GET /integration-profiles/by-hip/:hipId`, `GET /integration-profiles/by-tenant/:tid`
(both `assertConfiguratorInternalAccess`, `x-configurator-internal-key`),
`GET /internal/tenants/:id/enabled-module-ids` (`x-um-internal-key`).

> The onReady probe calls `resolveTarget` with a synthetic PROBE request (no body, params=PROBE_UUID).
> Every `authMode:'protected'` route MUST have a resolver entry returning non-null for that probe, or
> boot fails ("AuthZ mapping incomplete"). Resolver reads params/method/path only (never throws on
> missing body).

## Onboarding — the one non-uniform policy (faithful port of `assertTenantOnboardingAllowed`)
Today: super-admin may pick/create any org; a non-super-admin may onboard only under their JWT `org_id`.
Cerbos `configurator:tenant-onboarding` / `create`, two ALLOW rules:
1. capability `configurator:tenant-onboarding:create` in caps/delegated → allow (super-admin path; covers new-org).
2. `request.principal.attr.org_id == request.resource.attr.org_id` → allow (org-scoped self-service).
Resolver sets `resource.attr.org_id` from the request body `organization.id` defensively (optional
chaining; undefined on the probe → still returns a non-null target). The imperative
`assertTenantOnboardingAllowed` call is then REMOVED (behavior moves into the policy).

## Deliverables

### 1. master-data (Python) — capability seed
- `modules/master-data/alembic/versions/047_configurator_authorization_catalog.py` (revises `046`).
  Mirror `046`: seed `master_global.permissions` + `master_global.module_permissions` (join
  `m.slug='configurator'`) for the (resource, action) pairs above. Idempotent (INSERT … WHERE NOT EXISTS);
  downgrade soft-deletes. Catalog slugs `configurator.<resource-dotted>.<action>` chosen so the mapper
  yields the exact runtime keys the Cerbos policies gate on (assert the mapping in a UM unit test —
  `map-master-data-permission.test.ts` — to prevent #138 drift).
- Verify: `uv run --directory modules/master-data pytest -q`; `alembic upgrade head` on a throwaway DB;
  `ruff check .`.

### 2. Cerbos policies + tests (`infra/cerbos/policies/configurator/`)
- One resource policy file per kind (organization, tenant, tenant_module, tenant_integration_profile,
  sequence_configuration, tenant_api_key, branding, tenant_onboarding). Template = `master_data/module.yaml`
  (capability-membership, `roles:["*"]`, no tenant-eq) + the onboarding org-eq rule.
- `infra/cerbos/tests/configurator_permissions_test.yaml`: allow (super-admin w/ cap), deny (authenticated
  w/o cap), onboarding org-scope allow/deny.
- Verify: `cerbos compile infra/cerbos` (or the repo's compile target) → policies + tests green.

### 3. configurator (TS module) — resolver + route flags
- `modules/configurator/src/authz/configurator-authz-target-resolver.ts` — route table over the
  post-prefix paths → `{kind, id, action, attr?}`. Model on `billing-authz-target-resolver.ts` (strip
  `/api/configurator/v1`, HEAD→GET, `id` = relevant path param or `'__new__'`). Export
  `createConfiguratorAuthzTargetResolver` from `index.ts`.
- Tag each PROTECTED route with `config:{authMode:'protected'}` in its handler's route options.
- REMOVE the imperative `assertPlatformSuperAdmin` / `assertTenantOnboardingAllowed` calls on
  now-Cerbos-gated routes. Keep `assertConfiguratorInternalAccess` (S2S) untouched.
- **DELETE the unsigned-JWT dev fallback** in `http/request-auth-context.ts`
  (`authContextFromBearerJwt` / `readBearerJwtPayload`) — grep first for any flow that relies on the
  `ENABLE_AUTH`-off base64 path before removing (mirror #51's SYSTEM_DOCTOR_ID grep-before-delete).
- Unit test: resolver returns correct target per route incl. the probe (PROBE_UUID) case; unknown route → null.

### 4. configurator-svc (TS service) — wiring (copy billing/registration)
- Make identity **unconditional** (drop the `ENABLE_AUTH` escape hatch for the protected tier; keep the
  skip-prefixes for S2S/docs). Build the UM enricher off the SAME `DATABASE_URL`:
  `umDb=createDb(databaseUrl)` → 4 Drizzle repos → `createPepRuntimeAuthFromUrls({configuratorUrl(self),
  masterDataUrl, ...repos, runtimeEntitlementIntersection:false})` → register `principalRoleEnricherPlugin`
  then `authzPlugin({cerbosUrl:CERBOS_URL, resolveTarget})` in the router's encapsulation context
  (after root-level identity). `assertCerbosReachable(CERBOS_URL)` at boot; consume `CERBOS_URL` env.
- Thread `actor = request.user.userId` into created_by/updated_by where handlers currently derive it
  (was via `getRequestAuthContext`).

### 5. Docs / env
- `.env.example`: `CERBOS_URL` already documented — ensure configurator-svc consumes it; add any missing
  keys. Update `HANDOFF-resume-state.md` + memory on completion.

## Verification bar (mirror #51 — evidence, not claims)
1. master-data: pytest + ruff green; `alembic upgrade head` clean on throwaway DB.
2. Cerbos: `cerbos compile` + the new test file green.
3. configurator: `nx run configurator:test` (resolver unit) + `nx run configurator:lint` green;
   UM `map-master-data-permission` test asserts the configurator key mapping.
4. configurator-svc: `nx run configurator-svc:test` (if wiring-testable) + `tsc -p
   services/configurator-svc/tsconfig.json` exit 0.
5. **Live real-Cerbos round-trip** (Docker infra up): boot configurator-svc; (a) no bearer → 401 on a
   protected route; (b) super-admin bearer → 200 (cap present via snapshot); (c) authenticated non-cap
   bearer → 403; (d) internal S2S route still 200 with the internal key; (e) public tenant read still 200
   without a bearer.
6. **Adversarial-review workflow** (4 lenses: fail-open holes, onReady/probe breakage, capability-key
   drift, S2S/public regressions) before commit.

## Top integration risk (verify at step 5, mitigation ready)
`runtimeEntitlementIntersection` defaults **true** → the enricher intersects the super-admin's granted
capabilities with the *tenant's* entitled modules. A platform super-admin whose home tenant lacks the
`configurator` module entitlement would have `configurator:*` **stripped** → Cerbos denies. Mitigation:
set `runtimeEntitlementIntersection:false` for configurator-svc's enricher (platform-service semantics),
OR entitle the platform tenant with configurator. Decide empirically from the step-5 super-admin round-trip.

## Constraints (unchanged)
Branch `dev--improved-v1` only; never push `dev`. Stage by explicit path (never the not-ours untracked
WIP). Commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Never mutate
GH PRs/issues or the abandoned #135–#149 stack (reference only).

---

## Adversarial audit revisions (2026-07-07) — SUPERSEDE the above where they differ
A skeptical pass (read-only, against the real code) CONFIRMED the reuse thesis (C1–C9: enricher +
repos + `createPepRuntimeAuthFromUrls` reuse; `principalRoleEnricherPlugin` fp-name matches the
authzPlugin hard-dep; split-scope registration satisfies fastify's dep assertion; the exact
capability-key mapping; 046 is the sole alembic head; `runtimeEntitlementIntersection:false` threads
through and bypasses the strip; the onReady probe survives; no JWT-less protected routes; fail-closed
+ CERBOS_URL + the unsigned-JWT deletion all check out). **Must-fixes folded in:**

- **MAJOR-1 — post-047 re-seed is REQUIRED (not automatic).** `syncSuperAdminCapabilitySnapshots`
  only grants caps ALREADY in the UM `capabilities` table; the catalog→`capabilities` step is a
  SEPARATE function `syncCapabilitiesFromMasterDataCatalog` run by `make seed` /
  `tools/sync-capabilities-from-master-data.mts` / `applyPlatformDataBootstrap`, NOT at boot. After
  047 you MUST re-run `make seed` or super-admin gets 403. Added as deliverable step 2 + a
  verification line.
- **MAJOR-2 — the seed path may already be broken by migration 044.**
  `sync-capabilities-from-master-data-catalog.ts` (~line 50) and `platform-data-bootstrap.ts`
  (~line 182) still read the OLD schema `global_master` (renamed → `master_global` by 044). On a
  head-migrated DB `make seed` may throw *"Schema global_master not found"*. **Verify `make seed`
  works on a fresh migrate first**; if broken, the constant swap is a prerequisite this work owns.
- **MAJOR-3 — register enricher+authz BEFORE `createRouter`.** `authzPlugin`'s `onRoute` hook only
  sees routes registered AFTER it in the same/descendant scope. If enricher/authz land after
  `createRouter`, zero routes are gated → **silent fail-open** (worse than a boot error). Wire them
  inside `registerConfiguratorApi`, before `createRouter` (billing's order).
- **Finding 5 — read-caps: USER OVERRODE the audit trim (2026-07-07).** The audit argued reads should
  be identity-gate-only (master-data precedent). The user's counter — correct for THIS surface —
  configurator exposes cross-tenant **platform-admin** data, so "who may read the list of all orgs /
  a tenant's api-keys / integration credentials" **is an authorization decision** and must be
  **capability-gated**, per the platform's capability-based doctrine. (master-data's identity-only-reads
  precedent doesn't transfer: its catalog is broadly-readable *reference* data.) So the MAIN action
  table stands (reads included): organization {create,read,update}, tenant {create,update},
  tenant-module {create,read,update,delete}, tenant-integration-profile {create,read,update,delete},
  sequence-configuration {read,update}, tenant-api-key {create,read,update}, branding {create},
  tenant-onboarding {create}. "Identity-gated" (authenticated, no capability check — NOT role-based)
  is reserved ONLY for the genuinely-pre-auth tenant-catalog reads BFF/web need (`GET /tenants`,
  `/tenants/:id`, `/tenants/:tid/modules`, `branding-logos/ready`); verify each of those is truly
  meant to be readable pre-auth during the build.
- **Finding 4 — `GET /branding-logos/download` is bearer-required, not anonymous** (web fetches it
  with a bearer; it's NOT in the skip-prefixes). Leave it identity-gated; do NOT add it to the
  identity-skip list. Corrected the earlier "public" label.
- **Finding 6 — enrichment requires `tenantId` on the JWT** (`asIdentityPrincipal` returns null
  without both userId+tenantId). Works today (dev JWT carries a tenant); the future no-tenant
  `scope:platform` operator JWT would silently skip enrichment → 403. Added to the risk section.
- **Finding 7 — add an automated integration test** locking identity→enricher→authz→{401,200,403}
  (the wiring was only manually round-tripped; #51 shipped policy+integration coverage).
- **NITs 8/9 — onboarding resolver uses conditional attr-spread** (`...(orgId && {attr})`, billing's
  pattern) so undefined never serializes; note the two intentional semantic shifts (cap broader than
  role; org-equality on the *persisted* org_id).

## Super-admin framing correction (2026-07-07, per user)
The plan's policies gate on a SPECIFIC capability, never on "is super-admin" — that capability-check
IS the mechanism of the ratified **bounded `scope:platform` operator** model (D10; memory
`project_super_admin_operator_model.md`). Super-admin passing today is purely the interim DEV all-caps
seed (`dev/sync-super-admin-capability-snapshots.ts`), which D10 exists to strip. When the bounded
operator lands, these same capability policies enforce the boundary with no rewrite; configurator's
provisioning caps belong in the operator's bounded bundle. This PEP also removes configurator's
role-string `assertPlatformSuperAdmin` + the unsigned-JWT fallback — one of D10's four repoint targets.
The full audited page: `<scratchpad>/configurator-cerbos-pep/index.html` (from `plan.md`).

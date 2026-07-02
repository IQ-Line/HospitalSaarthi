# AuthZ assessment & remaining work (task 9) — 2026-06-21

This is the outcome of the task-9 "AuthZ centralization / Cerbos canonical rebuild" investigation
(a 3-agent understanding pass on `dev--improved-v1`). **Headline: the authz layer is already
canonical and healthy — no "rebuild" is warranted.** The heavy lifting was done by prior PRs; what
remains is narrow (test-suite hygiene around the capability vocabulary, minor policy hardening, and
enforcement-gap closure for services that have no PEP yet).

## What is already correct (verified, do NOT rebuild)

- **One canonical Cerbos direction.** All 14 resource policies (`user`, `role`, `capability`,
  `user_role_template`, `auth`, `registration`, `invoice`, `billing_account`, `tariff_master`, 3×
  `pharmacy_*`, `master_data:visitpad`) use the same `resourcePolicy` ABAC shape: gate on
  `request.principal.attr.iq_tenant_id == request.resource.attr.iq_tenant_id` **and** a
  `capabilities`/`delegated_capabilities` membership check (plus department/clearance where relevant).
  No `derivedRoles`/`exportVariables` — and that's fine; the explicit form is simple to audit. Adding
  derived roles now would be speculative abstraction (rejected per the simplicity doctrine).
- **Super-admin is NOT an unconditional bypass (D10 essentially resolved).** Every operational action
  requires the matching capability *even for super-admin*; the role only relaxes tenant-isolation for
  cross-tenant header scoping. The **single** unconditional `EFFECT_ALLOW` is `auth.read` for
  super-admin (self-principal snapshot for shell UX hydration — no other user's data). Now documented
  inline in `infra/cerbos/policies/user_management/auth.yaml`.
- **Real PEPs.** `request.cerbosPrincipal` is built by the principal-enrichment plugin →
  `DefaultPrincipalService.getPrincipal` → capabilities materialized from `user_capabilities` +
  `delegated_capability_grants`, optionally intersected with tenant entitlement; wired to Cerbos via
  `buildCerbosPrincipalWire`. Live Cerbos gRPC (0.42.0).
- **Capability keys are authoritative from Master Data.** Canonical format `module:feature:action`
  where `module` = Master Data `modules.slug` verbatim (identity mapping;
  `RUNTIME_MODULE_KEY_BY_CATALOG_SLUG` is empty). UM domain constants, dev-bootstrap
  `FOUNDATIONAL_CAPABILITIES`, the Cerbos policy literals, and `sync-capabilities-from-master-data-catalog`
  all use canonical **L2** slugs (`users`, `user-roles`, `user-capabilities`). A
  `LEGACY_TO_CANONICAL_CAPABILITY_KEY` remap + `projectCapabilityRowToCanonical` already handle
  legacy rows.

## Done in this pass

- Documented the `auth.read` intentional exception inline (auth.yaml).
- Canonicalized the 3 **entitlement-independent** capability-key test fixtures that were pure drift
  (`module:"user-management"` paired with an L2 key) → set `module` to the key's L2 segment:
  `get-capability.test.ts`, `admin-surface-routes.test.ts`,
  `cached-tenant-entitlement-resolver.test.ts`. (+4 tests recovered, zero regressions.)

## Remaining work (folded into the cleanup phase — test hygiene)

### Capability-key test-suite greening (18 `InvalidCapabilityKeyError` failures)
These are **test-stub fidelity gaps, not source bugs.** Real operation works: the entitlement engine
(`listAssignableRuntimeCapabilities`) seeds the assignable set with the **L1** platform slugs
(`PLATFORM_RUNTIME_MODULE_SLUGS = ["user-management","configurator"]`) and then calls
`masterDataModuleCatalogPort.expandEnabledModuleSlugs(...)`, which in real Master Data expands an L1
slug to its L2 descendants — so a capability with `module:"users"` IS assignable. But the **test stub**
`createMasterDataModuleCatalogPortStub.expandEnabledModuleSlugs` is identity (no expansion), so the
entitlement tests are forced to use the non-canonical `module:"user-management"` to stay assignable,
which the capability-key validator then rejects. The fixtures cannot satisfy both at once — proving
the stub, not the fixtures, is wrong.

**Exact fix recipe:**
1. In `modules/user-management/src/test-support/master-data-catalog-port-stub.ts`, make
   `expandEnabledModuleSlugs` mirror real Master Data: expand the platform L1 slugs to their L2
   children (`user-management` → `users`, `user-roles`, `role-capabilities`, `user-capabilities`;
   `configurator` → its L2 children per `027_core_modules_catalog.py`). Keep it data-driven off the
   catalog tree if practical (`expandModuleSlugsWithDescendants`).
2. Then canonicalize the entitlement-dependent fixtures to the L2 module that matches their key
   (`module:"users"` for `users:...`, etc.): `create-user.test.ts` (the capability fixtures only —
   leave the username/recovery_tier additions from the AuthN pass), `apply-role-template.entitlement.test.ts`,
   `replace-role-capabilities.entitlement.test.ts`, `replace-user-capabilities.entitlement.test.ts`,
   `apply-role-template-route.test.ts`, `detach-role-template-route.test.ts`.
3. **Mind the two assignability paths** in `isRuntimeCapabilityAssignableForTenant`
   (`domain/master-data-source-pair.ts`): **path 1** = `isPlatformRuntimeModuleSlug(module)` (true →
   always assignable), which is **L1-slug-based** (`user-management`/`configurator`); **path 2** =
   `source_module_slug`+`source_permission_slug` present AND `assignableModuleSlugs.has(sourceModule)`
   AND an active source pair. In REAL operation canonical L2 caps flow through **path 2** (real
   `expandEnabledModuleSlugs` puts `users` etc. into `assignableModuleSlugs`, and synced caps carry
   source links) — so this is NOT a production bug. The entitlement fixtures currently lean on path 1
   via `module:"user-management"`. **Recommended fix (no risky source change):** after fixing the stub
   to expand L1→L2, give those fixtures canonical `module:"users"` + populate `source_module_slug`/
   `source_permission_slug` (+ ensure the stub's `permissiveModulePermissionSourcePairs` covers them)
   so they pass via path 2 — mirroring real operation. Do NOT broaden `isPlatformRuntimeModuleSlug` to
   L2 unless you deliberately want L2 platform caps assignable with zero source links (a real-behavior
   change needing its own verification). `master-data-source-pair.test.ts:44` tests path 1 in
   isolation — keep its `module:"user-management"` (it's deliberately exercising L1 platform
   recognition, not drift).
4. Pre-prod note: no DB remap migration needed — fresh seed from Master Data already produces
   canonical keys; the legacy remap covers any stragglers.

### Enforcement-gap closure (services with no PEP — prioritized)
Separate, larger efforts (each needs the principal-enrichment + authzPlugin + a target-resolver +
Cerbos policies wired into that service):
- **HIGH — `configurator-svc`**: tenant/organization/module provisioning is high-sensitivity and is
  currently gated only by a role-based access check (`assertTenantOnboardingAllowed`), not Cerbos.
  Either wire a full PEP + `configurator` resource policies, or formally document + enforce
  internal-only API-key scoping as the intended model.
- **MEDIUM — `opd-svc` (Python)**: no Cerbos integration; needs a Python PEP or an explicit
  internal-only boundary doc.
- **VERIFY — `bff`, `empi-svc`, `integration-hub-svc`, `record-foundation-svc`**: confirm they are
  internal-only / gateway-delegating; if any accept end-user requests, add a PEP.

### Minor Cerbos polish (low priority)
- `master_data:visitpad` policy gates only on capability, no tenant-isolation condition — verify
  visitpad is truly platform-global; if tenant-scoped, add the `iq_tenant_id` equality condition.
- `pharmacy`/`billing` target-resolvers read `tenantId` directly without `resolveEffectiveTenantId`
  (no cross-tenant super-admin header support) — confirm intended or align with user-management.

## Decisions
- **Ignore the abandoned PR stack (#135–#149).** The current state is already the canonical direction;
  those branches are superseded. (Per the isolation constraint: reference only, never mutate.)
- **No `derivedRoles`/`exportVariables`.** Explicit ABAC is simple enough; adding them is unjustified
  abstraction today.

---

## Resolution — task #51 (2026-07-01)

Task #51 ("per-module in-process authz — close the direct-to-service bypass") splits into two
genuinely different halves. Ground truth re-verified 2026-07-01 (opd/master-data/configurator/BFF).

### Half A — #48-M3 privileged-flag passthrough — **DONE (`4eeb53cd`)**

The vector lived in **user-management** (not master-data — master-data's catalog is exemplary:
`extra="forbid()"` Pydantic schemas, no `is_system`/`status`/`role_type` columns). UM's
`create-role`/`update-role` spread the request body into persistence, so a tenant caller could set
the platform-controlled `is_system` flag on its own role — inert today (`is_system` is display-only)
but a latent escalation. Closed by gating `is_system` on the verified principal being the platform
super-admin (`isPlatformSuperAdminRequest`, the same definition that gates cross-tenant scoping). UM
verifies the JWT (`authMode:"protected"`), so this is real enforcement, not header-trust. Onboarding
(super-admin, JWT forwarded through the provisioning adapter) is unaffected; every other caller gets
`is_system` forced false. Sincere end-to-end test drives the real router. See the commit for details.

### Half B — Python direct-to-service enforcement (opd, master-data)

> **UPDATE 2026-07-01: the user greenlit building Half B now (the FULL per-module Cerbos PEP, not just
> close-the-bypass).** Build plan: **`half-b-python-cerbos-pep-build-plan.md`** (canonical tooling =
> PyJWT `PyJWKClient` for RS256/JWKS verify + official async `cerbos` Python SDK for the PDP; enrichment
> HTTP-first via UM `/auth/principal`; rebuild `packages/py-sdk-authz` clean). The analysis below records
> WHY it was initially deferred (still useful context); it is now being executed.

**Original framing (deferred rationale — kept for the record):** This is Phase-4 "Authorization rebuild"
work (roadmap §6), and deferring it was the correct default for cleanup, not avoidance:

- **No verified principal exists downstream.** opd (`core/tenant.py`, `core/principal.py`) and
  master-data (`api/deps.py get_catalog_scope`) read only `iq_tenant_id`/`x-tenant-id` and
  `x-user-id` **as trusted headers** — no JWT verification, no Cerbos. The BFF edge injects **only**
  user-id + validated tenant downstream (no role/capability/super-admin header). So a Python module
  literally cannot authorize a request in-process without first re-implementing JWT verify +
  capability resolution.
- **The eventual vehicle already has a (stale) footprint.** `packages/py-sdk-authz/` is an
  untracked, reverted scaffold (only `egg-info`/`.pyc`/`.venv` detritus survive; its `SOURCES.txt`
  shows the intended `client.py`/`dependency.py`/`middleware.py`/`types.py` FastAPI-Cerbos shape).
  It is **not-ours** — reference only. Building a competing PEP here would collide with that
  initiative and duplicate the TS-side `@hims/ts-sdk-authz` at the wrong time.
- **Ecosystem-canonical posture (what we rely on until Phase-4):** the BFF edge is the
  authentication + tenant-scope chokepoint (D13/#47 — JWT verify, `x-user-id` forced from the
  verified sub, tenant header asserted+canonicalized, ban cutoff). Downstream Python services trust
  edge-injected identity — the standard *gateway authentication offloading* pattern — **provided they
  are not reachable except through the edge.** Fine-grained per-service PDPs are the defense-in-depth
  layer the TS modules already have and the Python modules will gain in Phase-4.

**PRE-PROD GATE — ✅ SATISFIED by Half B (2026-07-02), no longer load-bearing:**
1. **In-process identity/PDP — DONE.** opd (`c82aa82a`) and master-data (`d08710b4`) now run the
   full `hims_authz` PEP: in-process RS256/JWKS JWT verification (fail-closed identity gate) + per-route
   Cerbos authorization. Tenant/actor come from the VERIFIED principal, never trusted headers. So the
   app layer — not the network boundary — is now the primary security boundary.
2. **Network isolation — DONE (defense-in-depth).** `infra/k8s/base/network-policies.yaml` restricts
   opd-svc + master-data ingress to same-namespace sources (BFF edge + S2S); nothing external reaches
   them except through the BFF (ingress routes only `/api`→bff, `/_cerbos`→cerbos, `/`→web).

**Residual — ✅ CLOSED by Phase 4c (2026-07-02, `57356fd2`):** master-data **visitpad (52 write
routes)** are now capability + tenant gated (department-pattern `master_data_visitpad.yaml` +
`visitpad_guard` on all 52 writes; cerbos 119/119, 252 pytest, live 11/11, adversarially reviewed).
**Picklists have no write routes** — nothing to gate. Only `actor_id` audit-attribution for visitpad
is deferred (audit, not security; ~66 fns; belongs with the ADR-0024 audit-middleware follow-up).
Task #51 (per-module in-process authz for opd + master-data) is now COMPLETE. Remaining Python-authz
work is other modules (e.g. configurator-svc has no Cerbos PEP) — separate Phase-4 items, not #51.

### Gated follow-ups — RESOLVED by Half B (kept for the record)
- **master-data dead `app/core/security.py`** — ✅ DELETED in Phase 5 (`d08710b4`+Phase-5 commit),
  along with the other dead auth scaffolding (`middleware/auth_policy.py` unsigned-JWT
  `resolve_superadmin_actor`, `middleware/auth_middleware.py` no-op `BearerAuthContextMiddleware`,
  `api/auth.py` unwired `require_superadmin`, and the `auth_disabled`/`jwt_secret`/`auth_bypass`/
  `dev_bearer_token` config escape hatches).
- **master-data unauthenticated writes / `actor_id` always NULL** — ✅ CLOSED (`d08710b4`): the five
  admin catalogs' writes are Cerbos-guarded and `actor_id` is the verified JWT `sub` (real
  `created_by`/`updated_by`, incl. the bulk platform-import path).
- **configurator-svc** — role-string gates (`assertPlatformSuperAdmin`, `assertTenantOnboardingAllowed`
  org-scope) + two internal-key gates, **no Cerbos PEP**. Its identity fallback base64url-decodes the
  JWT **without signature verification** when `ENABLE_AUTH` is off (dev only). Full PEP = Phase-4.

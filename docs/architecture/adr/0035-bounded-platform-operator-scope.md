# ADR-0035: Phase-4 authorization — bounded platform-operator scope replaces god-mode super-admin

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Architect, Engineering Manager, Tech Lead
- **Consulted:** User Management module owner, Configurator module owner
- **Informed:** Whole engineering team

## Context and problem statement

The platform's authorization model reached its Phase-4 shape across four capability-model pivots (PRs #13/#42/#46/#56) without an umbrella ADR — [ADR-0031](./0031-um-role-template-snapshot-semantics.md) and [ADR-0032](./0032-runtime-effective-capabilities-entitlement-intersection.md) each recorded a *slice* (role-template snapshots; runtime entitlement intersection) but no single record states what the model **is** as built. This ADR is that overdue umbrella, and it ratifies the one genuinely new Phase-4 decision: **how a cross-tenant platform operator is authorized.**

The model as built (verified against the staged tree on `dev--improved-v1`, 2026-07-07):

- **Per-module Cerbos PEPs, across both languages.** Each service runs an unconditional `identityPlugin` (JWT verify) → principal enrichment → `authzPlugin` (Cerbos PDP) chain. The TS services carry it via `@hims/ts-sdk-authz`; the two Python services (`opd`, `master-data`) carry the equivalent via `packages/py-sdk-authz` (`hims_authz`) wired at `modules/opd/src/opd/core/authz.py` + `modules/master-data/app/core/authz.py` with their own Cerbos policies (`infra/cerbos/policies/opd/*`, `.../master_data/*`) — the completed #51 Half B. The W2 PEP fleet closed the last TS gaps — `configurator`, `empi`, `inventory`, plus `integration-hub` identity (commit `2b206f8c`); Configurator's PEP is now unconditional with no `ENABLE_AUTH` escape hatch (`services/configurator-svc/src/main.ts:147`).
- **Capabilities are data, not policy.** They are synced from the Master Data catalog into `user_management` (`dev/sync-capabilities-from-master-data-catalog.ts`), materialized into `user_capabilities` snapshots, intersected with tenant entitlement at hydration (ADR-0032), and written onto `principal.attr.capabilities` for Cerbos. Policies gate on capability *keys* (`"configurator:tenant:create" in request.principal.attr.capabilities`), never on identity strings — per [ADR-0005](./0005-policy-as-code-permission-data-as-config.md).

Against that backdrop, the **super-admin** — the operator who provisions tenants, seeds the catalog, and manages cross-tenant configuration — was still authorized by a **god-mode** mechanism inherited from the earliest bootstrap: a seed that granted the super-admin **every active catalog capability** and a **magic `"super-admin"` role string** matched in policy/handler code. Both are exactly the "get-it-to-work" artifacts this cleanup removes: unbounded (holds every capability, including clinical/PHI actions across every tenant) and string-identified (authority rides a role name, not a controlled membership). The decision that remained: **what authorizes a platform operator, and what bounds it.**

## Decision drivers

- **The operator must be bounded, not god-mode.** Provisioning a tenant must not imply the ability to read that tenant's clinical records. Cross-tenant PHI reachability is the specific risk to eliminate.
- **Authority must ride a controlled membership, not a string.** A tenant that can name a role must gain nothing by naming it `"super-admin"` (the #48 reservation closed the label; this ADR removes the label's power entirely).
- **No magic values.** A sentinel tenant id in the token is the same class of artifact as the magic role string — cleanup does not trade one for another.
- **Scope-gated relaxation only.** The single hard-to-reverse concession — a tenant-less token — must be structurally impossible to reach without a signed, membership-issued marker.
- **Additive, not replacing.** Existing capability rules (delegated tenant-admins) must keep working unchanged; the operator rule is layered on top.
- **The bound must be a first-class invariant**, visible in the policy files, not an emergent property no one owns.

## Considered options

For the operator authorization mechanism:

1. **Keep god-mode all-caps super-admin** — the operator holds every catalog capability; authority via the `"super-admin"` role string.
2. **Sentinel `PLATFORM_TENANT_ID`** — issue the operator a normal (tenant-bearing) token whose `iq_tenant_id` is a reserved constant that policies special-case.
3. **A dedicated operator role with a curated capability bundle** — a fixed set of platform capabilities granted to an operator role, gating policies on those keys.
4. **A bounded `scope:platform` claim from a tenant-less membership table** — authority is membership in `platform_admins`; the token carries `scopes:["platform"]` and omits the tenant; policies additively allow platform-provisioning actions on that scope, and clinical policies deliberately do not.

## Decision outcome

Chosen option: **Option 4 — a bounded `scope:platform` claim issued from a tenant-less `platform_admins` membership.** As built:

**1. The membership table.** `user_management.platform_admins` (`modules/user-management/src/schema/tables.ts:391`) is keyed by the global platform `user_id` and carries **no `tenant_id`** — the only tenant-less table in the schema. It is a **Citus REFERENCE table** (`migrations/0006_platform_admins.sql:15`, `create_reference_table`), replicated to all nodes because it is small and globally read at JWT-issuance and enrichment time — the same shape as `user_management.capabilities`.

**2. Scope issuance.** At claim load, `platformAdminRepository.isPlatformAdmin(userId)` decides `scopes: isPlatformAdmin ? ["platform"] : []` (`modules/user-management/src/authn/identity-jwt-claims.ts:49,57`). The token builders (`create-hims-better-auth.ts:222-232`, `issue-access-jwt.ts:75-84`) **omit `iq_tenant_id`** from the operator token when platform-scoped — no sentinel; the tenant claim is simply absent. `scopes` flows to Cerbos via `packages/ts-sdk-authz/src/principal-attr.ts:32`.

**3. The hard-to-reverse bet — scope-gated tenant relaxation.** `packages/ts-sdk-identity/src/verify.ts` normally hard-requires a non-empty `iq_tenant_id` on every token. `toPrincipal` (`verify.ts:153-165`) relaxes that **only** when the signed token carries `scopes:["platform"]`; every other token still fails closed with the tenant requirement. This is the one security-critical concession in the model and it is deliberately narrow:
   - `scopes` is normalized by `sanitizeScopes` (`verify.ts:42-50`), which **never throws** — absent/garbage scopes yield `[]`, i.e. a non-operator principal that still hard-requires a tenant. Only an explicit, signed `"platform"` member relaxes anything.
   - `scopes` is only ever *issued* from `platform_admins` membership on an RS256/JWKS-signed JWT. A tenant user cannot forge the relaxation without forging the signature.
   - When tenant-less, `tenantId` is the empty string `""` — **not** a sentinel value that could be mistaken for a real tenant.

**4. Additive Cerbos allow, and the bound.** Each platform-provisioning resource policy carries an additive rule alongside its existing capability rules:

   ```yaml
   - actions: ["create", "update"]
     roles: ["*"]
     effect: EFFECT_ALLOW
     condition:
       match:
         expr: >-
           has(request.principal.attr.scopes) &&
           "platform" in request.principal.attr.scopes
   ```

   (`infra/cerbos/policies/configurator/tenant.yaml:28-42`.) The capability rules above it are untouched, so delegated tenant-admins keep working. **The platform-scoped surface is exactly these 18 resource policies:**
   - **Configurator (8):** `branding`, `organization`, `sequence-configuration`, `tenant`, `tenant-api-key`, `tenant-integration-profile`, `tenant-module`, `tenant-onboarding`.
   - **Master Data (6):** `department`, `module`, `module_permission`, `permission`, `system_role`, and `master_data_visitpad`.
   - **User Management (4):** `capability`, `role`, `user`, `user_role_template`.

   **The bound is the omission:** the clinical / tenant-staff policies — `opd`, `pharmacy`, `registration`, `empi`, `inventory`, `billing`, `record-foundation` — **intentionally carry no platform-scope rule**. A `scope:platform` token is powerless against them. This omission is the first-class invariant of the model, asserted in `infra/cerbos/tests/platform_operator_scope_test.yaml`.

**5. God-mode deleted (not demoted).** The seed no longer grants capabilities to the operator; it inserts one `platform_admins` row (`modules/user-management/src/dev/platform-data-bootstrap.ts:231-234`). The two god-mode mechanisms are removed from the tree:
   - `modules/user-management/src/dev/sync-super-admin-capability-snapshots.ts` (granted *every* active catalog capability) — **deleted**.
   - `services/user-management-svc/src/bootstrap/repair-platform-super-admin.ts` (re-granted them on every startup) — **deleted**.
   - `packages/dev-bootstrap/src/platform-operator-capability-keys.ts` is now an **empty list** with a `@deprecated` note — the operator holds no capabilities.
   - The `"super-admin"` role string survives as a **display label only** (`modules/user-management/src/domain/reserved-role-codes.ts:2-14`): "Platform authority no longer flows from this string." A tenant that mints a role named `super-admin` gains nothing (the #48 reservation still blocks the label as hygiene).

Cross-tenant request scoping (an operator acting on tenant X via an `iq_tenant_id` header) is likewise gated on the scope, not the string: `isPlatformSuperAdminRequest` (`modules/user-management/src/http/resolve-effective-tenant-id.ts:74-80`) reads `scope:platform`, and only then does `resolveEffectiveTenantId` honor a differing tenant header (`:87-102`).

### D11 — username uniqueness (ratified Q-C, 2026-07-07)

**Decision: usernames are GLOBALLY unique, not per-tenant.** Login is username-primary ([ADR-0003](./0003-authn-better-auth-identity-adapter.md)); a global handle keeps sign-in unambiguous without a tenant selector and matches the operator model (a tenant-less operator has no tenant to scope its handle by). This was the open D11 register item, resolved Q-C on 2026-07-07 (`docs/architecture/cleanup/00-cleanup-master-map.md:243`, `HANDOFF-resume-state.md:163`).

**Reconciliation against the staged code — enforced at the correct layer, given Citus distribution.** Global uniqueness is enforced by the *authoritative* login-handle store: the better-auth `username` plugin makes `auth.user.username` **globally unique** and lowercased (`services/user-management-svc/src/auth/create-hims-better-auth.ts:163-168`), on the `auth.*` tables which are deliberately **non-distributed** (`modules/user-management/migrations/0001_better_auth_schema.sql:6` — "NEVER run through Citus `create_distributed_table`/`create_reference_table` … they stay local"), so a plain global-unique index is available there. That is the table sign-up writes and login reads — the decision holds at the point of creation. The `user_management.users` projection carries `unique("uq_users_tenant_username").on(iq_tenant_id, username)` (`modules/user-management/src/schema/tables.ts:70`), which is **per-tenant *because it must be*: `users` is `create_distributed_table(..., 'iq_tenant_id')` (`0002_distribute_citus.sql:42`) and Citus requires a distributed table's unique constraints to include the distribution column** — a global-unique on `username` alone is not expressible on that table. The projection therefore holds the strongest constraint Citus permits, backstopped by the auth-layer global guarantee; the two are consistent by construction, not drift. This is the same shared-DB + Citus-distribution multi-tenancy model recorded in the analysis docs (distribution on `iq_tenant_id`, not schema-per-tenant), and it is why the global handle lives on the non-distributed identity anchor rather than the distributed profile row.

### The platform-capability boundary (standing constraint)

Configurator / platform capabilities (e.g. `configurator:tenant-api-key:*`) **must remain platform-bundle-only — never granted into a tenant-scoped role.** The platform policies keep their *capability* branch alongside the new *scope* branch (a policy allows if the caller holds the capability **OR** carries `scope:platform`). Some of those surfaces gate **cross-tenant secret reads** — `configurator:tenant-api-key` exposes tenant API keys. If a platform capability were ever assignable into an ordinary tenant role, the capability branch would let a tenant principal reach those secrets. The operator model makes `scope:platform` the **structural home** for this authority; platform capabilities must not leak into tenant entitlement. This is recorded as a standing review constraint (it complements the #48/#51 role-flag reservations that stopped a tenant from *minting* platform authority).

### Consequences

**Positive:**

- **Cross-tenant PHI is unreachable by the operator.** The bound is structural (policy omission), not a runtime check that can be forgotten, and it is regression-tested.
- **Authority rides a controlled, auditable membership** (`platform_admins` rows) instead of a magic string or an unbounded capability grant.
- **No sentinel, no magic value** anywhere in the token or policies — the tenant-less token is honestly tenant-less.
- **Additive design preserves the existing model** — delegated tenant-admins and all capability rules are untouched; ADR-0031/0032 semantics hold.
- **The god-mode seed/repair code is gone**, so no non-prod path re-inflates the operator to all-capabilities.

**Negative / accepted trade-offs:**

- **A signed `scope:platform` claim is powerful** — a JWT-signing-key compromise yields a tenant-less cross-tenant operator. This is the same trust root as all identity (RS256/JWKS); the relaxation is scope-gated but the residual risk is real and accepted.
- **The bound is enforced by a policy *omission*.** Adding a platform-scope rule to a clinical policy would silently widen the operator; only review + the scope test guard against it. A reviewer must treat "add `scope:platform` to a clinical policy" as a security change.
- **`verify.ts` now has a conditional tenant requirement** — marginally more complex than an unconditional one, and load-bearing for security. The complexity is centralized in one gate (`isPlatformScoped`) to keep it auditable.
- **Username global-uniqueness is layered:** enforced globally on the non-distributed `auth.user` anchor, per-tenant on the Citus-distributed `users` projection (the strongest a distributed table permits). Consistent by construction — not a defect — but any future move of the authoritative handle onto a distributed table would break the global guarantee, so the anchor must stay non-distributed.

**Follow-up actions:**

- [ ] **Operator-action audit trail.** A `scope:platform` operator can legitimately mint/read a tenant API key (`configurator:tenant-api-key:*`) and reset a tenant user's password (`user.reset_password`) cross-tenant — powers a platform operator needs, but each is an indirect path to acting *as* a tenant user (and thus reaching that tenant's clinical data through the tenant user's own authority, not the operator's scope). This is not a widening of the bound — the operator's *own* scope still denies clinical actions — but it means operator use of those two powers must be audited/break-glass before go-live. — platform-security owner
- [ ] **Every clinical action must hit the PDP.** The bound lives only at Cerbos: a clinical route that authorized on "valid JWT + tenant header" without calling the PDP would be cross-tenant-reachable by an operator (who holds a valid JWT). All clinical services are PEP'd today (W2 + the built `opd`/`master-data` Python PEPs); add a standing inventory test asserting no clinical action authorizes without the PDP so a future route can't regress it. — platform-security owner
- [ ] **Unify tenant resolution.** The generic `packages/ts-sdk-tenant/src/plugin.ts:70-81` still resolves tenant **header-first** with no scope gate (a header overrides the JWT tenant unconditionally), whereas UM's `resolveEffectiveTenantId` honors a cross-tenant header **only** for `scope:platform` principals. The generic path is a W2 flag queued behind the module/service composition work; converge it onto the scope-gated shape. — platform-security owner
- [ ] **ajv `removeAdditional` hard-400.** The option to reject (rather than strip) unknown request-body fields at the edge is parked; revisit with the API-hardening pass. — parked
- [ ] Reference this ADR from `CLAUDE.md` / the platform-security LLD as the authoritative Phase-4 authorization record. — leads

## Pros and cons of the options

### Option 4 — Bounded `scope:platform` from `platform_admins` (chosen)

- *Good:* Bounded by construction — the operator can only touch the 18 platform-provisioning policies; clinical/PHI surfaces are unreachable.
- *Good:* Authority is a controlled membership row, not a string or an unbounded grant; the relaxation is scope-gated and signature-rooted.
- *Good:* Additive — leaves the entire capability model (ADR-0031/0032) and delegated-admin flows intact.
- *Bad:* The bound is a policy omission enforced by review + one test, not by a mechanism that makes over-grant impossible.
- *Bad:* Introduces a conditional tenant requirement into the identity SDK's hottest path.

### Option 1 — Keep god-mode super-admin

- *Bad:* Unbounded — holds every catalog capability, including clinical actions, across every tenant; cross-tenant PHI is reachable.
- *Bad:* String-identified — authority rides a role name; the exact "get-it-to-work" artifact cleanup removes.
- *Bad:* Requires a startup "repair" job to keep re-granting all capabilities — a self-inflating footgun.

### Option 2 — Sentinel `PLATFORM_TENANT_ID` in the token

- *Bad:* A magic value is the same class of artifact as the magic role string — trades one footgun for another.
- *Bad:* A real-looking tenant id that isn't a real tenant invites accidental joins / mis-scoped queries; the tenant-less token is honest, the sentinel is not.

### Option 3 — Dedicated operator role with a curated capability bundle

- *Bad:* Re-creates the "which capabilities does the operator need?" sprawl every time a platform surface is added; the bundle drifts.
- *Bad:* Puts platform authority back into the capability channel, exactly where the platform-capability-boundary constraint says it must not live (a curated bundle is a hair's breadth from leaking into a tenant role).
- *Good:* Reuses the existing capability machinery — but scope is the strictly bounded primitive, and that outweighs the reuse.

## Links

- Related ADRs:
  - [ADR-0004 — Cerbos sidecar for authorization](./0004-authz-cerbos-sidecar.md) (the PDP these PEPs call)
  - [ADR-0005 — Policy as code, permission data as config](./0005-policy-as-code-permission-data-as-config.md) (why authority is data/scope, never a hardcoded string)
  - [ADR-0031 — UM role-template snapshot semantics](./0031-um-role-template-snapshot-semantics.md) (capability snapshot slice)
  - [ADR-0032 — Runtime effective capabilities = stored ∩ tenant entitlement](./0032-runtime-effective-capabilities-entitlement-intersection.md) (hydration slice)
  - [ADR-0003 — better-auth identity adapter](./0003-authn-better-auth-identity-adapter.md) (username-primary login; global username plugin)
- Evidence (staged on `dev--improved-v1`):
  - `modules/user-management/src/schema/tables.ts:391` (platform_admins), `:70` (per-tenant username constraint — Citus-mandated on the distributed projection; global uniqueness on the non-distributed `auth.user` anchor)
  - `modules/user-management/migrations/0006_platform_admins.sql` (Citus reference table)
  - `packages/ts-sdk-identity/src/verify.ts:42-50,153-165` (scope-gated tenant relaxation — the hard-to-reverse bet)
  - `modules/user-management/src/authn/identity-jwt-claims.ts`, `services/user-management-svc/src/auth/issue-access-jwt.ts:75-84`, `create-hims-better-auth.ts:163-168,222-232` (scope issuance + global username plugin)
  - `infra/cerbos/policies/configurator/tenant.yaml:28-42` (additive rule) + the 18-policy platform surface; `infra/cerbos/tests/platform_operator_scope_test.yaml` (the bound, tested)
  - Deleted god-mode: `.../dev/sync-super-admin-capability-snapshots.ts`, `.../bootstrap/repair-platform-super-admin.ts`; `packages/dev-bootstrap/src/platform-operator-capability-keys.ts` (now empty)
  - `modules/user-management/src/domain/reserved-role-codes.ts:2-14` (super-admin string = display label only)
  - PEP fleet: commit `2b206f8c`; `services/configurator-svc/src/main.ts:147`
- Related cleanup: `docs/architecture/cleanup/00-cleanup-master-map.md` (D10 operator ratification, #48/#51 role-flag reservations, W2/W3 waves), `HANDOFF-resume-state.md` (D11 Q-C resolution)

---
title: Identity & Authorization, end-to-end
objective: How a request proves who it is (AuthN) and what it may do (AuthZ) across the HIMS monorepo — better-auth identity, the ADR-0037 capability model, the Master-Data catalog pipeline, Cerbos, and the PEP fleet.
---

This is the flagship tour of **who you are** and **what you may do** in HIMS. Two
separable concerns, wired together by one object — the **principal** returned from
`GET /auth/principal`:

- **AuthN (identity):** better-auth mints a short-lived RS256 JWT. Any service
  verifies it against a JWKS and gets a `request.user` — *only* `sub`, `tenant`,
  `roles`, `org`, `department`, `scopes`. **No permissions live in the token.**
- **AuthZ (authorization):** User-Management resolves the user's *effective
  capabilities* live from the database, hands them to **Cerbos** (the PDP), and a
  per-service **PEP** enforces allow/deny on every protected route.

The golden rule, stated in code and policy comments throughout: **the JWT carries
identity; Cerbos decides authority.** Frontend permission checks are UX only.

```diagram title="The two halves and the object that joins them" look=clean
flowchart LR
  subgraph AuthN["AuthN — identity"]
    BA["better-auth<br/>RS256 JWT"] --> V["ts-sdk-identity<br/>verifyToken"]
  end
  subgraph AuthZ["AuthZ — authority"]
    PS["PrincipalService<br/>live DB resolve"] --> CB["Cerbos PDP"]
  end
  V --> PS
  V -.->|"request.user<br/>(identity only)"| PEP["PEP<br/>per route"]
  PS -->|"principal.attr<br/>capabilities, tenant,<br/>dept, clearances, scopes"| PEP
  PEP --> CB
  CB -->|"ALLOW / DENY"| PEP
```

<!-- chapter: Identity (AuthN) -->

## Identity is better-auth; the platform owns the user row

There are **two identity spaces**, linked by a shared id:

- **auth user** — owned by better-auth (`auth.user`, password hashes, sessions,
  the JWKS signing keys). Username-primary (ADR-0003); email is a *synthetic
  anchor*, not the login handle.
- **platform user** — `user_management.users`, the tenant-scoped business record
  (`iq_tenant_id`, `department`, `org_id`, `clearance_tier_required`, api-key).

A `databaseHooks.user.create.before` hook forces the better-auth row's `id` to
equal the platform user's id (`forceAllowId: true`), so `auth.user.id === users.id`
for every provisioned user. `users.auth_user_id` is the explicit anchor column.

```code lang=ts file=services/user-management-svc/src/auth/create-hims-better-auth.ts hl=3,6,9
betterAuth({
  baseURL: env.authBaseUrl, basePath: "/api/auth",
  disabledPaths: ["/is-username-available"],        // block username enumeration
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true, revokeSessionsOnPasswordReset: true },
  plugins: [ bearer(), username({ minUsernameLength: 3, maxUsernameLength: 30 }),
             admin(), jwt({ /* RS256 + JWKS, see below */ }) ],
})
```

The `admin()` plugin backs server-side provisioning and recovery
(`auth.api.createUser / setUserPassword / revokeUserSessions / ban`). better-auth
owns password hashing end-to-end — the module never sees plaintext or hashes.

## JWT issuance — RS256, JWKS, identity-only claims

The `jwt()` plugin signs a 5-minute RS256 token and publishes its public keys at
`/api/auth/.well-known/jwks.json` (keys rotate every 7 days with a 14-day verify
grace). The claim payload is built by `definePayload` from
`loadIdentityJwtClaims` — whose doc comment is explicit: *"Capabilities,
delegations, and clearances must never appear here."*

```api-endpoint method=POST path=/api/user-management/auth/login title="Login → one round-trip: identity + principal"
. auth none — public route (identity plugin skips /auth/login)
. body identifier string — username (preferred) or email
. body password string
response 200:
{
  "access_token": "<RS256 JWT, 5 min>",
  "token_type": "Bearer",
  "expires_in": 300,
  "refresh_token": "<opaque>",
  "session_token": "<better-auth session>",
  "tenant_id": "<iq_tenant_id>",
  "user": { "id": "…", "username": "…", "department": "…" },
  "principal": { "id": "…", "roles": ["doctor"], "attributes": { "capabilities": ["…"] } }
}
```

The signed JWT payload (`create-hims-better-auth.ts` `definePayload` /
`issue-access-jwt.ts`):

```code lang=jsonc file=modules/user-management/src/authn/identity-jwt-claims.ts hl=3,7
{
  "sub": "<platform user id>",
  "iq_tenant_id": "<tenant>",   // OMITTED when scopes includes "platform" (BET4 — see ch.5)
  "org_id": "<org|null>",
  "roles": ["doctor"],
  "scopes": [],                  // ["platform"] only for platform operators
  "department": "cardiology",    // present only when non-empty
  "jti": "<uuid>", "iss": "…", "aud": "…", "iat": 0, "exp": 0
}
```

```callout tone=info title="Why 5 minutes and no permissions in the token"
A short RS256 access token means a de-listed operator or a revoked capability
takes effect on the *next* token refresh (≤5 min), not hours later. Because
authority is resolved live from the DB at each request (chapter 2), the token can
stay tiny and identity-only — it never goes stale on *what you may do*.
```

## Verification — every service, one plugin

`@hims/ts-sdk-identity`'s `identityPlugin` runs an `onRequest` hook: it skips a
small allowlist (`/healthz`, `/readyz`, `/livez`, and configured
`skipPathPrefixes` like `/api/auth`), then requires `Authorization: Bearer`,
verifies with `verifyToken`, and decorates `request.user: Principal`.

```code lang=ts file=packages/ts-sdk-identity/src/verify.ts
// RS256 only; JWKS fetched + cached per-kid (default TTL 5 min);
// requiredClaims = ["sub","roles","jti","exp","iat"]; maxTokenAge default 300s (cap 900);
// clock skew <= 60s. iq_tenant_id is enforced in toPrincipal (not by jose) so a
// platform-scoped token may legally omit it.
request.user = await verifyToken(token, options)
```

```diagram title="Login and per-request verification"
sequenceDiagram
  participant B as Browser/SPA
  participant UM as user-management-svc
  participant BA as better-auth
  participant SVC as any resource svc
  B->>UM: POST /auth/login (username, password)
  UM->>BA: signIn.username
  BA-->>UM: session + set-cookie
  UM->>UM: issue RS256 JWT + hydrate principal
  UM-->>B: access_token + principal + set-cookie
  Note over B,SVC: later request to another service
  B->>SVC: GET /… (Authorization: Bearer JWT)
  SVC->>BA: fetch JWKS (cached 5 min)
  SVC->>SVC: verifyToken → request.user
```

<!-- collapsible: Where sessions and tokens actually live -->
- **Server session state:** better-auth `auth.session` table. JWTs are stateless
  (`jti`, 5 min); `session_id` is deliberately *not* a required JWT claim.
- **Browser:** the durable credential is the **better-auth session cookie**. The
  5-min access token + refresh token are held in-memory (Zustand). Cold start
  re-mints the JWT from the cookie via `GET /api/auth/token`
  (`services/web/src/lib/auth-session.ts`).
- **Edge (`services/bff`):** a `@fastify/http-proxy` gateway that verifies the
  bearer once and hardens identity headers (`x-user-id` from the verified `sub`)
  for polyglot backends. It is *not* a token-minting BFF; `/api/auth` proxies
  straight to user-management where better-auth + JWKS live.
<!-- collapsible:end -->

<!-- chapter: The capability model (ADR-0037) -->

## The authorization schema

All authz tables live in the `user_management` schema, Citus-distributed on
`iq_tenant_id` (except the two reference tables). **ADR-0037** (dated 2026-07-09,
matches code) is the current shape: role composition is read **live**, and
`user_capabilities` is *exclusively* a per-user grant/deny override table.

```data-model title="User-Management authorization tables (modules/user-management/src/schema/tables.ts)"
. roles
.   iq_tenant_id uuid PK
.   id uuid PK
.   code text — e.g. "doctor" (lowercase, unique per tenant)
.   role_type text
.   is_system boolean
.   status text — active | inactive
. capabilities
.   id uuid PK — reference table (replicated, tenant-less)
.   capability_key text — "<module>:<feature>:<action>", globally unique
.   module text
.   feature text
.   action text
.   source_catalog text — 'master_data' when synced from the catalog
.   source_module_slug text
.   source_permission_slug text
.   is_active boolean
. role_capabilities
.   iq_tenant_id uuid PK
.   id uuid PK
.   role_id uuid FK -> roles.id — ON DELETE cascade
.   capability_id uuid FK -> capabilities.id — ON DELETE restrict
. user_roles
.   iq_tenant_id uuid PK
.   id uuid PK
.   user_id uuid FK -> users.id
.   role_id uuid FK -> roles.id
.   assigned_by_user_id uuid
. user_capabilities
.   iq_tenant_id uuid PK
.   id uuid PK
.   user_id uuid FK -> users.id
.   capability_id uuid FK -> capabilities.id
.   effect text — 'grant' | 'deny'  (CHECK)  ← the override
.   reason text — audit trail for the deliberate exception
.   granted_by_user_id uuid
.   granted_at timestamptz
. delegated_capability_grants
.   iq_tenant_id uuid PK
.   id uuid PK
.   source_user_id uuid FK -> users.id
.   target_user_id uuid FK -> users.id
.   capability_id uuid FK -> capabilities.id
.   starts_at timestamptz
.   ends_at timestamptz — nullable (open-ended)
.   status text — pending | active | revoked | expired
. user_clearances
.   iq_tenant_id uuid PK
.   id uuid PK
.   user_id uuid FK -> users.id
.   clearance_key text
.   clearance_level text
. platform_admins
.   user_id uuid PK — GLOBAL platform user id; tenant-LESS reference table (see ch.5)
.   granted_by uuid
roles ||--o{ role_capabilities : composes
capabilities ||--o{ role_capabilities : listed in
users ||--o{ user_roles : assigned
roles ||--o{ user_roles : to users
users ||--o{ user_capabilities : overrides
capabilities ||--o{ user_capabilities : pinned
users ||--o{ delegated_capability_grants : delegated to
```

```callout tone=decision title="ADR-0037: no snapshot, no source_role_id on overrides"
Earlier eras (ADR-0031, PR #56) *materialized* role-derived rows into
`user_capabilities` with a `source_role_id` FK. That could not deliver
"restrict a user below their role" at the PDP — the live-join half always
re-added the role's full set. ADR-0037 **drops the snapshot**: `role_capabilities`
is read live every request (a role edit reaches all assignees on their next
request, no re-apply), and `user_capabilities` rows carry **no FK to any role**,
so a per-user exception survives role edits and role deletion by construction.
```

## The one-query resolution recipe

`listEffectiveCapabilityKeys` is the whole read path — one round-trip. A UNION of
the two *additive* sources (role-derived ∪ grant-overrides), filtered by a
correlated `NOT EXISTS` **deny** check. Deny wins.

```code lang=ts file=modules/user-management/src/data-access/principal-authorization-repository.ts hl=1,6,11
// effective = (role_capabilities ⨝ user_roles)  ∪  grant-overrides   EXCEPT   deny-overrides
const roleDerived   = role_capabilities ⨝ user_roles  where user = ?     // Layer 1 (live)
const grantOverrides = user_capabilities where effect = 'grant'          // Layer 2 (grant)
const additive = union(roleDerived, grantOverrides)

select capability_key from additive ⨝ capabilities
where NOT EXISTS (                                                        // Layer 2 (deny wins)
  select 1 from user_capabilities
  where effect = 'deny' and capability_id = additive.capability_id
)
```

The **same deny check** is applied to `delegated_capability_grants` in
`listDelegatedCapabilityKeys` — because the Cerbos policy ORs `capabilities` with
`delegated_capabilities`, a deny missing from *either* array would be a silent
bypass. The write side (`replaceCapabilityOverrides`) enforces the same rule at
persist time: a capability in both the grant and deny lists of a `PUT` collapses
to a single `deny` row (the `UNIQUE(tenant, user, capability)` shape requires it).

```code lang=ts file=modules/user-management/src/data-access/user-access-repository.ts
// mergeOverrides: deny wins on collision, one row per capability
for (const grant of grants) merged.set(grant.capability_id, { effect: "grant", … });
for (const deny  of denies)  merged.set(deny.capability_id,  { effect: "deny",  … });  // overwrites
```

## Worked example — "Doctor, minus one, plus one"

Dr. Singh holds role `doctor`. An admin adds one **grant** override
(`billing:invoice:override-price`, an exception the role doesn't carry) and one
**deny** override (`opd:prescription:create`, "under supervision").

```diagram title="Set algebra for Dr. Singh" look=clean
flowchart TB
  R["role doctor<br/>opd:prescription:read<br/>opd:prescription:create<br/>opd:encounter:read"]
  G["grant override<br/>billing:invoice:override-price"]
  D["deny override<br/>opd:prescription:create"]
  U(["UNION<br/>role ∪ grant"])
  R --> U
  G --> U
  U --> X{"EXCEPT<br/>deny?"}
  D --> X
  X --> E["EFFECTIVE<br/>opd:prescription:read<br/>opd:encounter:read<br/>billing:invoice:override-price"]
```

| capability | from role | grant | deny | **effective** |
|---|:--:|:--:|:--:|:--:|
| `opd:prescription:read` | ✓ | | | **✓** |
| `opd:prescription:create` | ✓ | | ✗ | **denied** |
| `opd:encounter:read` | ✓ | | | **✓** |
| `billing:invoice:override-price` | | ✓ | | **✓** |

```callout tone=info title="One more filter sits on top (ADR-0032)"
Before the keys reach Cerbos, the effective set is **intersected with the
tenant's entitlement** (which modules Configurator has enabled for the tenant).
A capability the user holds but the tenant hasn't purchased/enabled is filtered
out — an empty entitlement set yields an empty effective set (fail-safe narrow).
See `compute-effective-principal-capabilities.ts`.
```

<!-- chapter: Catalog pipeline -->

## Where capabilities come from: Master Data owns the catalog

Capability *definitions* are not authored in User-Management. **Master Data** (the
Python module) owns the catalog: `permissions`, and the `module_permissions`
junction that says "this permission is available for this module." A one-way sync
projects that catalog into UM's `capabilities` table.

```diagram title="Catalog → runtime pipeline (one-way)"
flowchart LR
  subgraph MD["master-data (Python, master_global schema)"]
    P["permissions<br/>action ∈ create/read/<br/>update/delete/manage"]
    M["modules"]
    MP["module_permissions<br/>(junction)"]
    SRP["system_role_permissions<br/>(junction)"]
    P --> MP
    M --> MP
  end
  MP -->|"sync tool<br/>(module_permissions ⨝ m ⨝ p)"| CAP["user-management.capabilities<br/>source_catalog = master_data"]
  CAP -->|"principal enrichment"| ATTR["principal.attr.capabilities<br/>[ module:feature:action ]"]
  ATTR -->|"CEL string match"| POL["Cerbos policy conditions"]
  SRP -.->|"NO consumer yet"| X["(catalog-completeness only)"]
```

The sync is `tools/sync-capabilities-from-master-data.mts` → 
`syncCapabilitiesFromMasterDataCatalog`. It reads the catalog over a direct SQL
join, maps each row to the canonical runtime shape, upserts by `capability_key`,
and **deactivates orphans** (a UM row whose source pair vanished from the catalog
flips `is_active=false`).

```code lang=sql file=modules/user-management/src/dev/sync-capabilities-from-master-data-catalog.ts
SELECT m.slug AS module_slug, p.slug AS permission_slug,
       p.action AS permission_action, p.name AS permission_name
FROM master_global.module_permissions mp
  JOIN master_global.modules m      ON m.id = mp.module_id
  JOIN master_global.permissions p  ON p.id = mp.permission_id
WHERE NOT mp.is_deleted AND NOT m.is_deleted AND NOT p.is_deleted
  AND mp.is_active AND m.is_active AND p.is_active
```

## The key format is the contract

A runtime `capability_key` is **`<moduleSlug>:<feature>:<action>`** — lowercase,
**colon**-separated, three segments. (Master Data's `permissions.slug` uses a
*dotted* `<resource>.<action>` convention; the mapper converts one to the other,
e.g. `abdm.care-context.create` → `abdm:care-context:create`.)

```code lang=ts file=modules/user-management/src/domain/capability-key.ts hl=2
// The third segment is closed to this allowlist (fail-closed reject otherwise):
RUNTIME_CAPABILITY_ACTIONS = ["access","assign","compose","create","deactivate",
  "delete","manage","override-price","read","update","view"]
// MD-only verbs are aliased into it during sync: { edit: "update", write: "update" }
```

That exact key string is what Cerbos conditions test verbatim — the mapper's
output *is* the PDP's vocabulary:

```code lang=yaml file=infra/cerbos/policies/abdm/abdm.yaml
expr: >-
  "abdm:care-context:create" in request.principal.attr.capabilities ||
  "abdm:care-context:create" in request.principal.attr.delegated_capabilities
```

```callout tone=warning title="system_role_permissions has no runtime consumer — stated honestly"
Master Data also has a `system_role_permissions` junction (role↔permission) with a
full CRUD API, model, repository, and migration. **Nothing in User-Management, the
sync tool, the services, or Cerbos reads it** — verified by repo-wide grep; the
sync tool reads `module_permissions`, never `system_role_permissions`. It is
catalog-completeness only. A template→tenant *realization* path (turn a catalog
system-role into UM `roles` + `role_capabilities`) is not built yet.
```

<!-- chapter: Cerbos PDP + the PEP fleet -->

## The PDP: policy-as-code, decided by attributes not role names

Cerbos runs as a sidecar. Policies live under `infra/cerbos/policies/<module>/`,
one resource policy per resource. A defining trait: **every allow rule uses
`roles: ["*"]`** — the real decision is the CEL `condition`. So this is
capability/attribute-based (ABAC), not classic role-gating: since 2026-07-10 no
policy rule selects on a role name at all (the last `"super-admin"` selector and
`role_codes` string checks were removed — see the operator chapter). The policy
header even forbids authorizing on the Cerbos `roles` field alone.

```code lang=yaml file=infra/cerbos/policies/user_management/user.yaml
- actions: ["user.read"]
  roles: ["*"]
  effect: EFFECT_ALLOW
  condition:
    match:
      expr: >-
        request.principal.attr.iq_tenant_id == request.resource.attr.iq_tenant_id &&
        ("users:users:read" in request.principal.attr.capabilities ||
         "users:users:read" in request.principal.attr.delegated_capabilities) &&
        ( <department match, if resource carries one> ) &&
        ( request.principal.attr.um_clearance_effective_tier >=
          request.resource.attr.required_clearance )
```

The **principal wire object** the PEP sends to Cerbos is the same object
`GET /auth/principal` returns — built once by the enrichment plugin, cached on the
request:

```code lang=jsonc file=packages/ts-sdk-authz/src/principal-wire.ts
{
  "id": "<userId>",
  "roles": ["doctor"],                 // or ["__hims_authenticated__"] when role-less
  "attr": {
    "iq_tenant_id": "…", "department": "cardiology" , "org_id": "…",
    "role_codes": ["doctor"],          // JWT ∪ DB — policies use THIS, not `roles`
    "scopes": [],                      // ["platform"] for operators
    "capabilities": ["opd:prescription:read", …],
    "delegated_capabilities": [ … ],
    "clearances": { "phi": "tier2" },
    "um_clearance_effective_tier": 2
  }
}
```

```callout tone=info title="Policy test corpus, run in CI"
`infra/cerbos/tests/` holds **22 test suites** asserting **both ALLOW and DENY**
per surface, which Cerbos expands to **281** individual principal×resource×action
checks (`281 tests executed [281 OK]`). Several suites deliberately pin the
*absence* of removed authority: dead-string `super-admin` principals are asserted
DENIED, so re-introducing a role-selector rule fails the build. They run via `cerbos compile --tests` in Docker — in CI
(`.github/workflows/ci.yml`, which also boots a live PDP for PEP-wiring
integration tests) and via an equivalent Nx/Make target. A policy change that
breaks an expectation fails the build. Dedicated suites cover the hard edges:
`clearance_enforcement`, `department_isolation`, `tenant_isolation`,
`delegated_capabilities`, `platform_operator_scope`,
`entitlement_filtered_principal`.
```

## The PEP fleet: one per service, fail-closed, completeness-checked

Two implementations of the same contract — verify → enrich → check — one per
runtime.

<!-- tabs:start -->
<!-- tab: TypeScript (ts-sdk-authz) -->
`@hims/ts-sdk-authz`'s `authzPlugin` is a Fastify plugin. On every `protected`
route it resolves an **authz target** `{ kind, id, action, attr }` via a
per-service **resolver**, then calls Cerbos. Two guardrails:

- **Completeness probe (fail-closed, `onReady`):** at boot it drives a synthetic
  probe request through *every* protected route's resolver. If any returns
  `null`/`undefined`, startup **throws** `AuthZ mapping incomplete: <route>`. A
  route cannot ship without an explicit authz mapping.
- **preHandler enforcement:** resolve target → `checkResource` → `forbidden()` on
  deny. Decisions are cached per-request.

```code lang=ts file=services/user-management-svc/src/authz-target-resolver.ts
// A route table maps "METHOD /path" → { kind, id, action, attr }
"GET /users":       tenantScoped("user", "list", "user.read"),
"PATCH /users/:id": userScoped("user.update"),   // attrs from the target user's dept/clearance
"PUT /users/:id/capabilities": tenantScoped("user_role_template","new","role.assign"),
"GET /auth/principal": authSelf(),               // scoped to the caller's JWT home tenant
```
<!-- tab: Python (py-sdk-authz) -->
`hims_authz.Authz` exposes FastAPI dependencies. `require(kind, action)` runs the
full chain and fails closed: bad token → 401, enrichment failure → 401, Cerbos
deny **or PDP outage** → 403. Identity + principal are memoized on
`request.state` so multiple guards verify/enrich once.

```code lang=python file=packages/py-sdk-authz/src/hims_authz/dependency.py
@router.get("/prescriptions/{prescription_id}")
async def read(prescription_id: str,
               principal = Depends(authz.require("opd:prescription", "read"))):
    ...
```
Enrichment here is a **cross-service HTTP call**: the Python PEP fetches
`GET /auth/principal` from user-management (the `principal_url` setting) to obtain
the same capability-bearing principal, then calls Cerbos
(`AsyncCerbosClient`, `raise_on_error=True` so transport/5xx = deny). The
`CerbosPrincipal` dataclass is built to be byte-identical to the TS wire object,
so a policy evaluates the same way regardless of which runtime asked.
<!-- tabs:end -->

```callout tone=info title="Transport detail (for the diagram)"
The two PEPs reach the same PDP over **different transports**: the TypeScript
`authzPlugin` uses the Cerbos **gRPC** client (`@cerbos/grpc`, typically :3593);
the Python PEP uses the **HTTP** client (`AsyncCerbosClient`, :3592). CI runs one
PDP exposing both ports. Neither PEP uses a multi-resource batch check — each does
one single-resource `checkResource`/`is_allowed` per target, memoized per-request;
the one bulk primitive (`planResources`, Cerbos Query Plan) is decorated for
list-filtering but is *not* on the enforcing path.
```

```diagram title="A protected request, end to end"
sequenceDiagram
  participant C as Client
  participant PEP as Service PEP
  participant UM as user-management (/auth/principal)
  participant PDP as Cerbos
  C->>PEP: GET /prescriptions/123 (Bearer JWT)
  PEP->>PEP: verify JWT (JWKS) → request.user
  alt principal not yet enriched (e.g. Python svc)
    PEP->>UM: GET /auth/principal (Bearer JWT)
    UM->>UM: live-resolve caps ∩ entitlement
    UM-->>PEP: principal.attr { capabilities, tenant, dept, clearances, scopes }
  end
  PEP->>PEP: resolveTarget → { kind, id, action, attr }
  PEP->>PDP: check(principal, resource, action)
  PDP-->>PEP: EFFECT_ALLOW / EFFECT_DENY
  alt allow
    PEP-->>C: 200 (handler runs)
  else deny or PDP error
    PEP-->>C: 403 (fail closed)
  end
```

<!-- chapter: Boundaries & operator model -->

## RBAC vs ABAC — what's actually in the policies

Because every rule uses `roles: ["*"]`, the decision is entirely in the CEL
conditions. What those conditions actually reference (counted across
`infra/cerbos/policies`):

| Attribute in conditions | Role it plays |
|---|---|
| `capabilities` / `delegated_capabilities` | **primary gate** — the capability-key check (RBAC expressed as ABAC) |
| `iq_tenant_id` (principal vs resource) | **tenant isolation** — hard equality on almost every rule |
| `department` (principal vs resource) | **department scoping** — match when the resource carries one |
| `um_clearance_effective_tier` + `required_clearance` + `clearances` | **clearance tiers** — principal tier ≥ resource requirement |
| `scopes` | **platform-operator** relaxation (below) |
| `org_id` | org-scope on a few resources |
| `role_codes` | **zero authority** — informational only; the last string-based checks were removed 2026-07-10 |

## The platform operator: bounded, not god-mode (ADR-0035)

The former "super-admin" god-mode (a seed granting *every* capability) is deleted.
Its replacement is a **bounded `scope:platform`** claim:

```data-model title="platform_admins — the entire operator model"
. platform_admins
.   user_id uuid PK — GLOBAL platform user id; NO iq_tenant_id (tenant-less reference table)
.   granted_at timestamptz
.   granted_by uuid
.   note text
```

- **Tenant-less membership** → a **no-tenant JWT**: the operator token *omits*
  `iq_tenant_id` (no sentinel; simply absent). `verify.ts` relaxes its
  hard tenant requirement **only** for a signed token carrying `scopes:["platform"]`.
- The scope is issued **from the DB, not self-asserted**:
  `identity-jwt-claims.ts` sets `scopes = isPlatformAdmin ? ["platform"] : []` by
  reading `platform_admins`. Because `PrincipalService` also re-reads it at
  enrichment, a de-listed operator loses the scope on the next request.
- **The bound is the omission.** The platform scope additively allows exactly
  **16 provisioning policies** (Configurator 8, Master Data global catalogs 4,
  User-Management 4) plus the operator's own `auth.read`. Clinical policies
  (`opd`, `pharmacy`, `registration`, `empi`, `inventory`, `billing`,
  `department`, `visitpad`) carry **no** platform-scope rule — grepping `scopes`
  in those dirs returns zero. An operator is powerful at provisioning and
  *powerless* over patient data.

```code lang=yaml file=infra/cerbos/policies/configurator/tenant.yaml
- actions: ["create", "update"]
  roles: ["*"]
  effect: EFFECT_ALLOW
  condition:
    match:
      expr: >-
        has(request.principal.attr.scopes) && "platform" in request.principal.attr.scopes
```

## Frontend permissions are UX, not security

`services/web/src/stores/permissions.store.ts` is a Zustand store of
`capabilityKeys: ReadonlySet<string>` loaded from `GET /auth/principal`. Its
predicates (`hasCapability`, `hasAnyCapability`, `hasAllCapabilities`) are pure
`Set.has()` — they hide buttons and gate panels. They enforce nothing; the backend
Cerbos PEP is authoritative on every call.

```code lang=tsx file=services/web/src/features/user-management/components/user-access-panel.tsx
const showPanel = useAnyCapability([UM_ROLE_READ, UM_ROLE_ASSIGN]);
if (!showPanel) return null;   // UX gating only — the API still checks Cerbos
```

## Known open edges (stated honestly)

```callout tone=warning title="Two capabilities exist in the backend with no realized path yet"
1. **Grant/deny override editor UI is not built.** The backend
   `PUT /users/:id/capabilities` (ADR-0037 override replace) exists, and even the
   FE mutation hook `useReplaceUserCapabilities` is defined — but **no component
   calls it** (verified by grep; a code comment calls it a "follow-up UI"). Admins
   can restrict a user below their role via API, not yet via the app.
2. **`system_role_permissions` → tenant realization is pending.** The catalog
   junction exists (chapter 3) but nothing turns a catalog system-role into live
   UM `roles` + `role_capabilities`.
```

```callout tone=decision title="Resolved 2026-07-10: the super-admin string carries zero authority"
This page originally flagged residual `"super-admin"` string authority as a
doc-vs-code discrepancy. It has since been removed for real: 56 clinical
cross-tenant `roles:["super-admin"]` selectors, 19 shadowed User-Management
string rules, and the one unconditional `auth.read` rule (rewritten to
`scope:platform`) are gone. ADR-0035's claim is now literally true — no policy
rule keys on the role string, and the corpus pins the absence (dead-string
principals are asserted DENIED; re-adding a selector fails the build).
```

```callout tone=info title="Source-of-truth note"
Every claim on this page was read from current source on `dev--improved-v1`
(schema `tables.ts`, `principal-authorization-repository.ts`,
`user-access-repository.ts`, `default-principal-service.ts`, the identity/authz
SDKs, `infra/cerbos`, and the sync tooling). ADR-0037 and ADR-0035 were checked
against the code they describe and match; where an older ADR's shape was
superseded, the code wins and the callouts above flag it.
```

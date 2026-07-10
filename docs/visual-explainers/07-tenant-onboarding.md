---
title: Tenant onboarding & provisioning
objective: How a new tenant comes to exist end-to-end — one API call on configurator-svc that orchestrates org + tenant + module enablement + first admin (role, capabilities, auth account) across master-data and user-management, and the dev path to a working local tenant.
---

A new tenant is born from **one HTTP call** to configurator-svc. The handler orchestrates a saga-ish sequence that spans three services: it writes core rows locally (org, tenant, tenant_modules), then reaches into **master-data** (module + capability registry) and **user-management** (role + admin user + better-auth account) over HTTP. There is no distributed transaction — the code commits in stages and leaves clear breadcrumbs when a later stage fails.

<!-- chapter: The one call -->

## Entry point

`POST /api/configurator/v1/tenant-onboarding` — a single payload; the backend does the rest.

```api-endpoint method=POST path=/api/configurator/v1/tenant-onboarding title="Tenant onboarding (configurator-svc)"
. auth Bearer JWT — must satisfy Cerbos configurator:tenant_onboarding (see gate below)
. body organization object — {id?} to reuse an org, else {name,slug,type}
. body tenant object — {name, slug, type?, parent_tenant_id?, branch_*?}
. body plan object — {slug} required unless this tenant is a branch
. body modules array — product module_ids to enable (infra modules auto-added)
. body admin object — {first_name, username, password, email?, phone?}
request:
{ "organization": { "name": "Apollo Andheri", "slug": "apollo-andheri", "type": "standalone_hospital" },
  "tenant": { "name": "Apollo Andheri", "slug": "apollo-andheri" },
  "plan": { "slug": "starter" },
  "modules": [ { "module_id": "<opd-uuid>", "is_active": true } ],
  "admin": { "first_name": "Asha", "username": "asha.admin", "password": "hunter2secret" } }
response 201:
{ "tenant": { "iq_tenant_id": "…", "provisioning_status": "active" },
  "admin_role": { "code": "tenant-admin", "is_system": true },
  "admin_user": { "id": "…", "full_name": "Asha" },
  "provisioning_status": "completed",
  "correlation_id": "…" }
```

Source: `modules/configurator/src/rest-handlers/tenant-onboarding.handler.ts`, input DTO in `modules/configurator/src/domain/onboarding.types.ts`, prefix wired in `services/configurator-svc/src/main.ts`.

## Who may call it

The route is `authMode: "protected"`, gated by the configurator Cerbos PEP. The policy (`infra/cerbos/tests/configurator_permissions_test.yaml`) grants `create` on `configurator:tenant_onboarding` via **two** ALLOW paths:

```data-model title="Platform-operator gate (user-management schema)"
. platform_admins — the ONLY source of the JWT scopes:["platform"] claim
.   user_id uuid PK — global platform user id (users.id); tenant-LESS
.   granted_by uuid — granting operator, when known
.   note text
```

- **Platform scope** — the caller is enrolled in `platform_admins` (→ `scope:platform` claim). Bounded authority: tenant provisioning + the global catalog, *not* god-mode. This is the implemented interim model.
- **Org-scoped self-service** — a `tenant-admin` whose `principal.org_id == resource.org_id` (the target resolver lifts `org_id` off `organization.id` in the body). Lets an existing org onboard a sibling branch.

```callout tone=info title="Implemented vs. target"
`platform_admins` is a reference table carrying *no* capabilities — it replaced the former god-mode super-admin seed. The seeded dev operator's `roleCode` is still the string `"super-admin"`, but that is a display label only and bears zero authority (`packages/dev-bootstrap/src/development-seed-users.ts`). The broader `scope:platform` operator model is the ratified Phase-4 target; what ships today is this bounded membership table + additive PDP scope allow.
```

<!-- chapter: The provisioning saga -->

## The sequence

`provisionTenant()` (`modules/configurator/src/use-cases/provision-tenant.ts`) is the single orchestrator. It deliberately **commits the configurator rows first** so that the downstream entitlement checks (which call *back* into configurator to verify the tenant's modules) can see committed data.

```diagram title="provisionTenant orchestration" look=clean
sequenceDiagram
  participant Op as Platform operator
  participant Cfg as configurator-svc
  participant MD as master-data-svc
  participant UM as user-management-svc
  participant DB as configurator DB
  Op->>Cfg: POST /tenant-onboarding
  Note over Cfg: A. validate input
  Cfg->>MD: fetch infrastructure module ids
  MD-->>Cfg: infra ids (auto-enabled)
  Note over Cfg: C. createAuthAccount<br/>(deferred: stashes password)
  Cfg->>DB: TX org + tenant(provisioning) + tenant_modules
  DB-->>Cfg: COMMIT
  Cfg->>MD: resolve capability ids for modules
  MD-->>Cfg: capability ids
  Cfg->>UM: POST /roles (tenant-admin, is_system)
  Cfg->>UM: PUT /roles/:id/capabilities
  Cfg->>UM: POST /users (better-auth acct + platform user + grants)
  UM-->>Cfg: admin_user
  Cfg->>DB: TX update tenant -> active
  Cfg->>Cfg: publish tenant-onboarding.provisioning.completed
  Cfg-->>Op: 201 provisioning_status=completed
```

The lettered phases map 1:1 to the inline code comments (A validate, A2 infra modules, C auth prep, D core-entity commit, E capability resolve, F role+caps+user, G promote to active, H event).

```callout tone=decision title="Why the odd ordering"
`createAuthAccount` in the HTTP adapter does **not** call better-auth — it just stashes the password and returns the pre-generated `platformUserId`. The real work happens in `POST /users` on user-management, which creates the better-auth account *and* the platform user in one call (it has the role context). So configurator's port is a 4-method interface, but over HTTP two of the methods collapse into a single user-management round-trip. See `services/configurator-svc/src/adapters/http-tenant-admin-provisioning-adapter.ts`.
```

## Module enablement (configurator ↔ master-data)

`tenant_modules` is the per-tenant enablement table. `module_id` points at a row in **master-data's** global `modules` registry — a cross-service reference with **no FK** (master-data is a separate Python service / schema). Infrastructure modules are merged in first and flagged `is_core_override`, which a CHECK constraint then pins to always-active.

```data-model title="Module registry ↔ enablement"
. modules — master-data global catalog (Python service)
.   id uuid PK
.   slug text
.   category text
.   module_kind text — 'product' | infra/core; drives auto-enable
.   visibility_scope text — 'tenant' default
. tenant_modules — configurator per-tenant enablement
.   iq_tenant_id uuid PK — Citus distribution key
.   module_id uuid PK — refs master-data modules.id (NO cross-service FK)
.   is_active boolean — default true
.   is_core_override boolean — infra module; CHECK forces active
modules ||--o{ tenant_modules : enabled per tenant
```

<!-- chapter: Data & sharp edges -->

## Core configurator schema

```data-model title="configurator schema (modules/configurator/src/schema/tables.ts)"
. organizations
.   id uuid PK
.   slug text — unique
.   type text — hospital_chain | medical_college | standalone_hospital | government_network
.   status text — active default
. tenants
.   iq_tenant_id uuid PK — the tenant/shard id
.   org_id uuid FK -> organizations.id
.   parent_tenant_id uuid FK -> tenants.iq_tenant_id — null = root, set = branch
.   slug text — unique
.   provisioning_status text — provisioning -> active (suspended|decommissioned)
.   cerbos_scope_key text — unique; buildTenantCerbosScopeKey(orgId, slug)
.   free_follow_up_days smallint — default 15
. sequence_configuration
.   iq_tenant_id uuid PK FK -> tenants.iq_tenant_id
.   status text — 'default' | 'configured'
.   identifier_overrides jsonb — default {}
organizations ||--o{ tenants : owns
tenants ||--o| sequence_configuration : has
```

```callout tone=info title="Sequence config defaults are LAZY — no row at onboarding"
`provisionTenant` does **not** insert a `sequence_configuration` row. `getSequenceConfiguration` synthesizes a `status: "default"` view when `findByTenantId` returns null (`modules/configurator/src/use-cases/sequence-configuration.ts`); a real row is only `upsert`ed when an admin first configures an identifier. So "defaults" here means *implicit* — the tenant runs on system defaults until explicitly configured. (This contradicts any doc implying a default row is seeded — code wins.)
```

## The sharp edge — partial-failure on admin creation

There is **no compensating rollback** across the service boundary. The configurator rows (org, tenant, tenant_modules) commit *before* the user-management calls. If `POST /users` fails, the `catch` block logs and rethrows, leaving the tenant stranded in `provisioning`:

```code lang=ts file=modules/configurator/src/use-cases/provision-tenant.ts hl=4-7
  } catch (error) {
    console.error(
      "[tenant-onboarding] User-management provisioning failed after DB commit. " +
        "Tenant %s is in 'provisioning' state and needs manual cleanup. " +
        "Correlation: %s",
      coreData.tenant.iq_tenant_id, ctx.correlationId,
    );
    throw error;
  }
```

```callout tone=warning title="Two orphan windows still exist"
1. **Inside user-management** (`modules/user-management/src/use-cases/create-user.ts`): `createPasswordAccount` (better-auth) runs *before* `provisionUserWithAccess` (the platform-user DB transaction). If that transaction fails, the better-auth account is orphaned — the exact shape of the historical onboarding-500 bug (which was ultimately an `api_key` migration drift that masked the error). The platform-user + grants are now atomic in one transaction; the **auth account before it is not** part of that transaction.
2. **Across configurator ↔ user-management**: a failed `POST /users` leaves committed org/tenant/tenant_modules with `provisioning_status = "provisioning"` and no admin. Recovery today is *manual*, keyed by the logged `correlation_id`. The tenant is never promoted to `active`, so it is at least distinguishable from a healthy one.
```

<!-- chapter: Dev / local path -->

## Getting a working local tenant

Two seeders exist, and they are a **documented cross-schema exception** — they write directly across service schemas (bypassing the HTTP saga) purely for local bootstrap speed.

- `packages/dev-bootstrap/src` — shared constants/personas (the bounded platform operator + a pharmacist), stable dev UUIDs, the demo org/tenant ids.
- `tools/seed-user-management-dev` — the runnable seed: platform bootstrap (capabilities + `platform_admins` enrolment), a configurator org + tenant (`seed-configurator.ts` inserts `Dev Hospital`, slug `dev-hospital`, status `active`), master-data catalog, then a Cerbos smoke check.

```steps
# 1. Bring up infra + run migrations (master-data first, then user-management)
reuse npx nx run master-data:db-migrate — creates the global module/permission catalog
reuse npx nx run user-management:db-migrate — creates users/roles/platform_admins
> master-data must migrate first: capability resolution reads its catalog.
# 2. Seed a working local tenant + operator
reuse pnpm seed — runs tools/seed-user-management-dev/run.mts
> Seeds org+tenant+modules, the platform operator (scope:platform), roles, and validates Cerbos.
# 3. Sign in
reuse platform@hospitalsaarthi.dev / password — the seeded bounded platform operator
> Username-primary login (ADR-0003); the email here is contact data. Use this identity to hit /tenant-onboarding for additional tenants.
```

```callout tone=info title="Two ways to a tenant — keep them straight"
The **seeder** writes rows directly (fast, cross-schema, dev-only). The **`/tenant-onboarding` endpoint** is the real production path that goes through the HTTP saga with Cerbos, entitlement checks, and the completed event. Use the seeder to get a baseline tenant + operator; use the endpoint (as the operator) to exercise the actual onboarding flow.
```

## On success — the event

After promoting the tenant to `active`, `provisionTenant` publishes `tenant-onboarding.provisioning.completed` (best-effort — a publish failure is logged, never fails the API). The payload is rich (org + tenant ids/slugs, `admin_user_id`, `admin_role_id`, `enabled_module_ids`, `plan_slug`) so consumers can project without a follow-up read.

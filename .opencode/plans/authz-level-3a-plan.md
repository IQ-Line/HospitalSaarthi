# Level 3a — Authz Centralization

## Status: Ready to implement (context save point)

Decisions made:
- Configurator: **per-entity** Cerbos kinds (organization, tenant, tenant_module, tenant_onboarding)
- `registerAuthzStack()`: **DI-based** — caller passes identityPlugin + enrichmentPlugin; no new deps on ts-sdk-authz
- EMPI resource kind: **patient** (capability key: `empi:patient:*`)
- Configurator capability keys: `organization:organization:*`, `tenant:tenant:*`, `tenant-module:tenant-module:*`, `onboarding:onboarding:*`

---

## Files to create

### `packages/ts-sdk-authz/src/authz-stack.ts`
DI helper that registers identity → enrichment → authz in order + asserts Cerbos reachable.

```typescript
export interface RegisterAuthzStackOptions {
  cerbosUrl: string;
  identityPlugin: FastifyPluginAsync;
  identityAuth: Record<string, unknown>;
  principalEnrichmentPlugin: FastifyPluginAsync;
  principalEnrichmentOptions: { principalService: unknown; userRepository: unknown };
  resolveTarget?: AuthzTargetResolver;
  skipAuthPrefixes?: string[];
}

export async function registerAuthzStack(
  app: FastifyInstance,
  options: RegisterAuthzStackOptions,
): Promise<void>;
```

### `modules/user-management/src/create-default-principal-deps.ts`
Single function wrapping 3 Drizzle repos + `createDefaultPrincipalService`.

```typescript
interface PrincipalDeps {
  userRepository: DrizzleUserRepository;
  principalRoleProjectionRepository: DrizzlePrincipalRoleProjectionRepository;
  principalAuthorizationRepository: DrizzlePrincipalAuthorizationRepository;
  principalService: PrincipalService;
}

export function createDefaultPrincipalDeps(db: DbInstance): PrincipalDeps;
```

### New Cerbos policies

`infra/cerbos/policies/empi/patient.yaml` — 3-tier template, actions: `patient.{create,read,update,delete}`, cap: `empi:patient:*`

`infra/cerbos/policies/configurator/organization.yaml` — 3-tier, actions: `org.{read,create,update}`, cap: `organization:organization:*`

`infra/cerbos/policies/configurator/tenant.yaml` — 3-tier, actions: `tenant.{read,create,update}`, cap: `tenant:tenant:*`

`infra/cerbos/policies/configurator/tenant_module.yaml` — 3-tier, actions: `tenant-module.{read,create,update,delete}`, cap: `tenant-module:tenant-module:*`

`infra/cerbos/policies/configurator/tenant_onboarding.yaml` — 3-tier, actions: `onboarding.create`, cap: `onboarding:onboarding:*`

### New Cerbos test suites

`infra/cerbos/tests/empi_patient_permissions_test.yaml`
`infra/cerbos/tests/configurator_organization_permissions_test.yaml`
`infra/cerbos/tests/configurator_tenant_permissions_test.yaml`
`infra/cerbos/tests/configurator_tenant_module_permissions_test.yaml`
`infra/cerbos/tests/configurator_tenant_onboarding_permissions_test.yaml`

---

## Edits

### `packages/ts-sdk-authz/src/index.ts`
Add `registerAuthzStack` export.

### `modules/user-management/src/index.ts`
Add `createDefaultPrincipalDeps` export.

### `modules/empi/src/rest-handlers/patients.handler.ts`
Add `config.authz` on all 9 routes:

| Route | Action |
|---|---|
| POST `/patients` | patient.create |
| GET `/patients` | patient.read |
| GET `/patients/:id` | patient.read |
| PATCH `/patients/:id` | patient.update |
| PATCH `/patients/:id/status` | patient.update |
| POST `/patients/:id/identifiers` | patient.update |
| DELETE `/patients/:id/identifiers/:identifierId` | patient.update |
| POST `/patients/:id/addresses` | patient.update |
| PATCH `/patients/:id/addresses/:addressId` | patient.update |

### `modules/configurator/src/rest-handlers/organizations.handler.ts`
Add `config.authz` to all 4 routes. Remove `assertPlatformSuperAdmin` from POST.

| Route | Action |
|---|---|
| GET `/organizations` | org.read |
| POST `/organizations` | org.create |
| GET `/organizations/:id` | org.read |
| PATCH `/organizations/:id` | org.update |

### `modules/configurator/src/rest-handlers/tenants.handler.ts`
Add `config.authz` to all 4 routes.

| Route | Action |
|---|---|
| GET `/tenants` | tenant.read |
| POST `/tenants` | tenant.create |
| GET `/tenants/:id` | tenant.read |
| PATCH `/tenants/:id` | tenant.update |

### `modules/configurator/src/rest-handlers/tenant-modules.handler.ts`
Add `config.authz` to all 5 routes. Remove `assertPlatformSuperAdmin` from PATCH and DELETE.

| Route | Action |
|---|---|
| GET `/tenants/:tenantId/modules` | tenant-module.read |
| POST `/tenants/:tenantId/modules` | tenant-module.create |
| GET `/tenants/:tenantId/modules/:moduleId` | tenant-module.read |
| PATCH `/tenants/:tenantId/modules/:moduleId` | tenant-module.update |
| DELETE `/tenants/:tenantId/modules/:moduleId` | tenant-module.delete |

### `modules/configurator/src/rest-handlers/tenant-onboarding.handler.ts`
Add `config.authz` to POST route. Remove `assertTenantOnboardingAllowed` call inside handler.

| Route | Action |
|---|---|
| POST `/tenant-onboarding` | onboarding.create |

### `modules/configurator/src/http/request-auth-context.ts` (cleanup)
Remove `assertPlatformSuperAdmin`, `isPlatformSuperAdmin`, `isPlatformSuperAdminRole`, `getRequestAuthContext` if no longer used elsewhere.

Keep `PLATFORM_SUPER_ADMIN_ROLE` and `normalizeRoles` if referenced elsewhere.

### `modules/configurator/src/http/tenant-onboarding-access.ts` (DELETE)
Entire file deleted — Cerbos replaces `assertTenantOnboardingAllowed`.

### Services: `empi-svc/src/main.ts`
Add authz stack after identity plugin registration:

```typescript
import { registerAuthzStack } from "@hims/ts-sdk-authz";
import { createDefaultPrincipalDeps } from "@hims/user-management";

const { userRepository, principalService } = createDefaultPrincipalDeps(db);

// inside the /api scoped plugin, after identity:
await registerAuthzStack(api, {
  cerbosUrl: process.env.CERBOS_URL,
  identityPlugin,
  identityAuth: validateAuthConfig(),
  principalEnrichmentPlugin,
  principalEnrichmentOptions: { principalService, userRepository },
  skipAuthPrefixes: ["/docs"],
});
```

### Services: `configurator-svc/src/main.ts`
Same pattern as empi-svc — add authz stack.

### Services: `billing-svc/src/main.ts`
Refactor existing ~8 lines of identity+enrichment+authz registration into:

```typescript
const { userRepository, principalService } = createDefaultPrincipalDeps(db);
await registerAuthzStack(api, {
  cerbosUrl: CERBOS_URL,
  identityPlugin,
  identityAuth: identityAuth,
  principalEnrichmentPlugin,
  principalEnrichmentOptions: { principalService, userRepository },
});
```

### Services: `registration-svc/src/main.ts`
Same refactor as billing.

### Services: `user-management-svc/src/main.ts`
Same refactor, but includes `resolveTarget` for the 6 DB-backed routes.

---

## Implementation order

1. `createDefaultPrincipalDeps` in user-management
2. `registerAuthzStack` in ts-sdk-authz
3. Cerbos policy YAMLs (empi + 4 configurator)
4. Cerbos test suites (empi + 4 configurator)
5. EMPI handler edits (config.authz on 9 routes)
6. Configurator handler edits (config.authz on 14 routes + remove old guards)
7. Service wiring (empi-svc, configurator-svc, billing-svc, registration-svc, user-management-svc)
8. Run tests: `cerbos-policies:compile`, `ts-sdk-authz:test`, `lint`

---

## Files touched (~28)

```
CREATE  packages/ts-sdk-authz/src/authz-stack.ts
EDIT    packages/ts-sdk-authz/src/index.ts

CREATE  modules/user-management/src/create-default-principal-deps.ts
EDIT    modules/user-management/src/index.ts

EDIT    modules/empi/src/rest-handlers/patients.handler.ts

EDIT    modules/configurator/src/rest-handlers/organizations.handler.ts
EDIT    modules/configurator/src/rest-handlers/tenants.handler.ts
EDIT    modules/configurator/src/rest-handlers/tenant-modules.handler.ts
EDIT    modules/configurator/src/rest-handlers/tenant-onboarding.handler.ts
EDIT    modules/configurator/src/http/request-auth-context.ts
DELETE  modules/configurator/src/http/tenant-onboarding-access.ts
DELETE  modules/configurator/src/http/tenant-onboarding-access.test.ts

EDIT    services/empi-svc/src/main.ts
EDIT    services/configurator-svc/src/main.ts
EDIT    services/billing-svc/src/main.ts
EDIT    services/registration-svc/src/main.ts
EDIT    services/user-management-svc/src/main.ts

CREATE  infra/cerbos/policies/empi/patient.yaml
CREATE  infra/cerbos/policies/configurator/organization.yaml
CREATE  infra/cerbos/policies/configurator/tenant.yaml
CREATE  infra/cerbos/policies/configurator/tenant_module.yaml
CREATE  infra/cerbos/policies/configurator/tenant_onboarding.yaml
CREATE  infra/cerbos/tests/empi_patient_permissions_test.yaml
CREATE  infra/cerbos/tests/configurator_organization_permissions_test.yaml
CREATE  infra/cerbos/tests/configurator_tenant_permissions_test.yaml
CREATE  infra/cerbos/tests/configurator_tenant_module_permissions_test.yaml
CREATE  infra/cerbos/tests/configurator_tenant_onboarding_permissions_test.yaml
```

## Branch

Base: `feat/authz-level-2` (PR #136)

Branch name: `feat/authz-level-3a`

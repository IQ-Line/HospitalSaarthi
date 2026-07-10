import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import { InProcessEventBus } from "@hims/ts-sdk-events";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../../../src/data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../../../src/data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserProvisioningRepository } from "../../../src/data-access/in-memory-user-provisioning-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { userManagementPlugin } from "../../../src/router.js";
import { createMasterDataModuleCatalogPortStub } from "../../../src/test-support/master-data-catalog-port-stub.js";
import { createDepartmentCatalogPortStub } from "../../../src/test-support/department-catalog-port-stub.js";

// M1 (bounded-operator adversarial review) — a tenant-less platform operator (scope:platform,
// JWT tenant "") performing a tenant-scoped write with NO iq_tenant_id header must be rejected
// with a clean 400 TENANT_TARGET_REQUIRED, never silently persisted under tenant "". Drives the
// REAL router preHandler guard end-to-end. Four-way behavior: operator-no-header (400),
// operator-with-header (201 into target), normal tenant user (unaffected), api-key path
// (unaffected).

const OPERATOR_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d580";
const TARGET_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const APIKEY_TENANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const apps: Array<ReturnType<typeof Fastify>> = [];

type StubIdentity = {
  tenantId: string;
  scopes?: string[];
  roles?: string[];
  apiKeyTenantId?: string;
};

/** Stubs the identity boundary: attaches a verified principal (and optionally the api-key path). */
function identityStub(identity: StubIdentity) {
  return fp(
    async (fastify) => {
      fastify.addHook("onRequest", async (request) => {
        request.correlationId = randomUUID();
        (request as { user?: unknown }).user = {
          userId: OPERATOR_USER_ID,
          sub: OPERATOR_USER_ID,
          tenantId: identity.tenantId,
          orgId: null,
          roles: identity.roles ?? [],
          scopes: identity.scopes ?? [],
          sessionId: "session-1",
          iat: 1,
          exp: 9999999999,
          iss: "issuer",
        };
        if (identity.apiKeyTenantId !== undefined) {
          (request as { authViaApiKey?: boolean }).authViaApiKey = true;
          (request as { tenantId?: string }).tenantId = identity.apiKeyTenantId;
        }
      });
    },
    { name: "@hims/ts-sdk-identity-stub" },
  );
}

async function createApp(identity: StubIdentity) {
  const app = Fastify();
  apps.push(app);

  const userRepository = new InMemoryUserRepository();
  const capabilityRepository = new InMemoryCapabilityRepository([]);
  const roleRepository = new InMemoryRoleRepository([]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
    userAccessRepository,
    roleRepository,
  );
  const principalAuthorizationRepository = new InMemoryPrincipalAuthorizationRepository();

  await app.register(identityStub(identity));
  await app.register(
    async (instance) => {
      await instance.register(userManagementPlugin, {
        accessTokenIssuer: {
          async issueForPlatformUser() {
            return {
              access_token: "test-token",
              token_type: "Bearer" as const,
              expires_in: 300,
              refresh_token: "test-refresh",
              refresh_expires_in: 3600,
            };
          },
        },
        eventBus: new InProcessEventBus(),
        userRepository,
        userProvisioningRepository: new InMemoryUserProvisioningRepository(
          userRepository,
          userAccessRepository,
        ),
        capabilityRepository,
        roleRepository,
        roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
        userAccessRepository,
        principalRoleProjectionRepository,
        principalAuthorizationRepository,
        authAccountProvisioner: {
          async createPasswordAccount(input) {
            return { authUserId: input.platformUserId };
          },
        },
        tenantModuleEntitlementPort: {
          async listTenantEnabledModuleIds() {
            return [];
          },
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
        departmentCatalogPort: createDepartmentCatalogPortStub(),
      });
    },
    { prefix: "/api/user-management" },
  );

  return { app, userRepository };
}

function createUserPayload(overrides: Record<string, unknown> = {}) {
  return {
    full_name: "New Hospital User",
    email: "new.user@example.org",
    username: "new.user",
    password: "password-1234",
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.close();
      } catch {
        // Best-effort close keeps route tests isolated.
      }
    }),
  );
  apps.length = 0;
});

describe("tenant-target-required guard (real router preHandler, POST /users)", () => {
  it("operator + NO header → 400 TENANT_TARGET_REQUIRED (never persisted)", async () => {
    const { app, userRepository } = await createApp({ tenantId: "", scopes: ["platform"] });
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/users",
      payload: createUserPayload(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(expect.objectContaining({ code: "TENANT_TARGET_REQUIRED" }));
    // Mutation proof: without the guard this persists an orphan row under tenant "".
    expect(await userRepository.listUsers("")).toHaveLength(0);
  });

  it("operator + iq_tenant_id header → 201 into the TARGET tenant", async () => {
    const { app, userRepository } = await createApp({ tenantId: "", scopes: ["platform"] });
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/users",
      headers: { iq_tenant_id: TARGET_TENANT },
      payload: createUserPayload(),
    });
    expect(res.statusCode).toBe(201);
    // The row lands in the operator-targeted tenant, not "".
    expect(await userRepository.listUsers(TARGET_TENANT)).toHaveLength(1);
    expect(await userRepository.listUsers("")).toHaveLength(0);
  });

  it("normal tenant user (always has a JWT tenant) → unaffected by the guard", async () => {
    const { app, userRepository } = await createApp({
      tenantId: TARGET_TENANT,
      roles: ["tenant-admin"],
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/users",
      payload: createUserPayload(),
    });
    expect(res.statusCode).toBe(201);
    expect(await userRepository.listUsers(TARGET_TENANT)).toHaveLength(1);
  });

  it("api-key auth path (real tenantId set) → unaffected by the guard", async () => {
    const { app, userRepository } = await createApp({
      tenantId: "",
      apiKeyTenantId: APIKEY_TENANT,
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/users",
      payload: createUserPayload(),
    });
    expect(res.statusCode).toBe(201);
    expect(await userRepository.listUsers(APIKEY_TENANT)).toHaveLength(1);
  });
});

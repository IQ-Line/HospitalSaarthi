import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import type { CheckResult } from "@hims/ts-sdk-authz";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../../../src/data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../../../src/data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { InMemoryUserProvisioningRepository } from "../../../src/data-access/in-memory-user-provisioning-repository.js";
import type { Capability, Role } from "../../../src/ports/index.js";
import { userManagementPlugin } from "../../../src/router.js";
import { createMasterDataModuleCatalogPortStub } from "../../../src/test-support/master-data-catalog-port-stub.js";
import { createDepartmentCatalogPortStub } from "../../../src/test-support/department-catalog-port-stub.js";

const apps: Array<ReturnType<typeof Fastify>> = [];

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d650";
const ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d651";
const UNAPPLIED_ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d652";
const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d661";
const ACTOR_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d580";

const CAP_UM_ROW: Capability = {
  id: CAP_UM,
  capability_key: "users:users:read",
  module: "users",
  feature: "users",
  action: "read",
  display_name: "Read users",
  is_active: true,
  source_catalog: "master_data",
  source_module_slug: "users",
  source_permission_slug: "read",
};

const identityStubPlugin = fp(
  async (fastify) => {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    fastify.decorateRequest(
      "user",
      null as unknown as {
        userId: string;
        tenantId: string;
        orgId: string;
        roles: string[];
        sessionId: string;
        iat: number;
        exp: number;
        iss: string;
      },
    );
    fastify.addHook("onRequest", async (request) => {
      const inbound = request.headers["x-correlation-id"];
      request.correlationId =
        typeof inbound === "string" && uuidRe.test(inbound.trim())
          ? inbound.trim()
          : randomUUID();
      request.user = {
        userId: ACTOR_ID,
        tenantId: TENANT,
        orgId: "f47ac10b-58cc-4372-a567-0e02b2c3d581",
        roles: ["super-admin"],
        sessionId: "session-1",
        iat: 1,
        exp: 9999999999,
        iss: "issuer",
      };
    });
  },
  { name: "@hims/ts-sdk-identity-stub" },
);

const authzStubPlugin = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      request.checkResource = async (_kind: string, _id: string, action: string) =>
        ({
          isAllowed: (a: string) => a === action,
        }) as CheckResult;
      request.planResources = async () => ({}) as never;
    });
  },
  { name: "@hims/ts-sdk-authz-stub" },
);

const noopEventBus = {
  async connect() {},
  async disconnect() {},
  async publish() {},
  async subscribe() {
    return { async unsubscribe() {} };
  },
};

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

async function createTestApp() {
  const app = Fastify();
  apps.push(app);

  const userRepository = new InMemoryUserRepository();
  userRepository.insertUserWithId(TENANT, USER_ID, {
    full_name: "Assigned User",
    email: "u@example.com",
  });

  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: TENANT,
      role: {
        id: ROLE_ID,
        code: "clerk",
        role_type: "clerk",
        display_name: "Clerk",
        is_system: false,
        status: "active",
      } satisfies Role,
    },
    {
      tenantId: TENANT,
      role: {
        id: UNAPPLIED_ROLE_ID,
        code: "auditor",
        role_type: "auditor",
        display_name: "Auditor",
        is_system: false,
        status: "active",
      } satisfies Role,
    },
  ]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  const capabilityRepository = new InMemoryCapabilityRepository([{ capability: CAP_UM_ROW }]);
  const roleCapabilityRepository = new InMemoryRoleCapabilityRepository(
    [{ tenantId: TENANT, roleId: ROLE_ID, capabilities: [CAP_UM_ROW] }],
    [CAP_UM_ROW],
  );

  await userAccessRepository.applyRoleTemplate(TENANT, {
    userId: USER_ID,
    roleId: ROLE_ID,
    capabilityIds: [CAP_UM],
    actorId: ACTOR_ID,
  });

  await app.register(identityStubPlugin);
  await app.register(authzStubPlugin);
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
        eventBus: noopEventBus,
        userRepository,
        userProvisioningRepository: new InMemoryUserProvisioningRepository(
          userRepository,
          userAccessRepository,
        ),
        capabilityRepository,
        roleRepository,
        roleCapabilityRepository,
        userAccessRepository,
        principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
          userAccessRepository,
          roleRepository,
        ),
        principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
        authAccountProvisioner: {
          async createPasswordAccount(input) {
            return { authUserId: input.platformUserId };
          },
        },
        authPasswordAdmin: {
          async setUserPassword() {},
          async revokeUserSessions() {},
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

  return { app, userAccessRepository };
}

describe("DELETE /users/:id/roles/:roleId (detach role template)", () => {
  it("removes the association and revokes matching role_template grants", async () => {
    const { app, userAccessRepository } = await createTestApp();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/user-management/users/${USER_ID}/roles/${ROLE_ID}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({ user_id: USER_ID, role_id: ROLE_ID }),
    );

    await expect(userAccessRepository.listRoleTemplatesByUser(TENANT, USER_ID)).resolves.toHaveLength(
      0,
    );
    await expect(
      userAccessRepository.listActiveCapabilityGrantsByUser(TENANT, USER_ID),
    ).resolves.toEqual([]);
  });

  it("returns 404 when the role template was not applied", async () => {
    const { app } = await createTestApp();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/user-management/users/${USER_ID}/roles/${UNAPPLIED_ROLE_ID}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "USER_ROLE_TEMPLATE_NOT_FOUND",
      }),
    );
  });
});

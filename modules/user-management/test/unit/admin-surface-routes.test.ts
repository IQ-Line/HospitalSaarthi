import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../../src/data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../../src/data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../../src/data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../../src/data-access/in-memory-user-repository.js";
import { userManagementPlugin } from "../../src/router.js";
import { InMemoryUserProvisioningRepository } from "../../src/data-access/in-memory-user-provisioning-repository.js";
import { createMasterDataModuleCatalogPortStub } from "../../src/test-support/master-data-catalog-port-stub.js";
import { createDepartmentCatalogPortStub } from "../../src/test-support/department-catalog-port-stub.js";

const apps: Array<ReturnType<typeof Fastify>> = [];

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
        userId: "f47ac10b-58cc-4372-a567-0e02b2c3d580",
        tenantId: "tenant-a",
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
  userRepository.insertUserWithId("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d590", {
    full_name: "Assigned User",
  });

  const capabilityRepository = new InMemoryCapabilityRepository([
    {
      capability: {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d591",
        capability_key: "user-management:roles:read",
        module: "user-management",
        feature: "roles",
        action: "read",
        display_name: "Read roles",
        description: "Read tenant-scoped roles.",
        is_active: true,
      },
    },
  ]);
  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: "tenant-a",
      role: {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d592",
        code: "admin",
        role_type: "admin",
        display_name: "Admin",
        is_system: false,
        status: "active",
      },
    },
    {
      tenantId: "tenant-a",
      role: {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d593",
        code: "auditor",
        role_type: "auditor",
        display_name: "Auditor",
        is_system: false,
        status: "active",
      },
    },
  ]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  await userAccessRepository.applyRoleTemplate("tenant-a", {
    userId: "f47ac10b-58cc-4372-a567-0e02b2c3d590",
    roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d593",
    capabilityIds: [],
    actorId: null,
  });
  await userAccessRepository.applyRoleTemplate("tenant-a", {
    userId: "f47ac10b-58cc-4372-a567-0e02b2c3d590",
    roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d592",
    capabilityIds: [],
    actorId: null,
  });

  const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
    userAccessRepository,
    roleRepository,
  );
  const principalAuthorizationRepository = new InMemoryPrincipalAuthorizationRepository();

  await app.register(identityStubPlugin);
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

  return app;
}

describe("User Management admin surface routes", () => {
  it("returns the canonical capability by id", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/capabilities/f47ac10b-58cc-4372-a567-0e02b2c3d591",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d591",
        capability_key: "user-management:roles:read",
      }),
    );
  });

  it("rejects malformed route ids before hitting the role handlers", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/roles/not-a-uuid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "route parameter id must be a UUID.",
      }),
    );
  });

  it("lists applied role templates for a user", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/users/f47ac10b-58cc-4372-a567-0e02b2c3d590/roles",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      expect.objectContaining({
        role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d593",
        role: expect.objectContaining({
          code: "auditor",
        }),
      }),
      expect.objectContaining({
        role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d592",
        role: expect.objectContaining({
          code: "admin",
        }),
      }),
    ]);
  });
});

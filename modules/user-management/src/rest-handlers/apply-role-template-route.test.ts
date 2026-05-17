import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import type { CheckResult } from "@hims/ts-sdk-authz";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { InMemoryUserProvisioningRepository } from "../data-access/in-memory-user-provisioning-repository.js";
import type { Capability, Role } from "../ports/index.js";
import { userManagementPlugin } from "../router.js";

const apps: Array<ReturnType<typeof Fastify>> = [];

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d650";
const ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d651";
const CAP_UM = "f47ac10b-58cc-4372-a567-0e02b2c3d661";
const CAP_EMP = "f47ac10b-58cc-4372-a567-0e02b2c3d662";
const CAP_NOT_ON_ROLE = "f47ac10b-58cc-4372-a567-0e02b2c3d663";

const CAP_UM_ROW: Capability = {
  id: CAP_UM,
  capability_key: "um:user:read",
  module: "user-management",
  feature: "users",
  action: "read",
  display_name: "Read users",
  is_active: true,
};

const CAP_EMP_ROW: Capability = {
  id: CAP_EMP,
  capability_key: "empi:patient:read",
  module: "empi",
  feature: "patient",
  action: "read",
  display_name: "Read patient",
  is_active: true,
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
        userId: "f47ac10b-58cc-4372-a567-0e02b2c3d580",
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

type TestApp = {
  app: ReturnType<typeof Fastify>;
  userAccessRepository: InMemoryUserAccessRepository;
};

async function createTestApp(entitlement: {
  moduleIds?: string[];
  slugs?: Map<string, string>;
}): Promise<TestApp> {
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
        display_name: "Clerk",
        is_system: false,
        status: "active",
      } satisfies Role,
    },
  ]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  const capabilityRepository = new InMemoryCapabilityRepository([
    { capability: CAP_UM_ROW },
    { capability: CAP_EMP_ROW },
  ]);
  const roleCapabilityRepository = new InMemoryRoleCapabilityRepository(
    [
      {
        tenantId: TENANT,
        roleId: ROLE_ID,
        capabilities: [CAP_UM_ROW, CAP_EMP_ROW],
      },
    ],
    [CAP_UM_ROW, CAP_EMP_ROW],
  );

  await app.register(identityStubPlugin);
  await app.register(authzStubPlugin);
  await app.register(
    async (instance) => {
      await instance.register(userManagementPlugin, {
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
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: vi.fn().mockResolvedValue(entitlement.moduleIds ?? []),
        },
        masterDataModuleCatalogPort: {
          resolveModuleSlugsByIds: vi.fn().mockResolvedValue(entitlement.slugs ?? new Map()),
        },
      });
    },
    { prefix: "/api/user-management" },
  );

  return { app, userAccessRepository };
}

describe("POST /users/:id/roles (apply role template)", () => {
  it("accepts role_template_capability_ids subset and synchronizes only selected grants", async () => {
    const { app, userAccessRepository } = await createTestApp({});

    const response = await app.inject({
      method: "POST",
      url: `/api/user-management/users/${USER_ID}/roles`,
      payload: {
        role_id: ROLE_ID,
        role_template_capability_ids: [CAP_UM],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({ user_id: USER_ID, role_id: ROLE_ID }),
    );

    const grants = await userAccessRepository.listActiveCapabilityGrantsByUser(TENANT, USER_ID);
    const roleTemplateGrants = grants.filter((grant) => grant.grant_source === "role_template");
    expect(roleTemplateGrants.map((grant) => grant.capability_id).sort()).toEqual([CAP_UM]);
  });

  it("applies full role composition when role_template_capability_ids is omitted", async () => {
    const empiModuleId = "33333333-3333-4333-8333-333333333333";
    const { app, userAccessRepository } = await createTestApp({
      moduleIds: [empiModuleId],
      slugs: new Map([[empiModuleId, "empi"]]),
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/user-management/users/${USER_ID}/roles`,
      payload: { role_id: ROLE_ID },
    });

    expect(response.statusCode).toBe(201);

    const grants = await userAccessRepository.listActiveCapabilityGrantsByUser(TENANT, USER_ID);
    const roleTemplateGrants = grants.filter((grant) => grant.grant_source === "role_template");
    expect(roleTemplateGrants.map((grant) => grant.capability_id).sort()).toEqual(
      [CAP_EMP, CAP_UM].sort(),
    );
  });

  it("rejects capability ids that are not on the role template", async () => {
    const { app } = await createTestApp({});

    const response = await app.inject({
      method: "POST",
      url: `/api/user-management/users/${USER_ID}/roles`,
      payload: {
        role_id: ROLE_ID,
        role_template_capability_ids: [CAP_NOT_ON_ROLE],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "INVALID_INPUT",
        message: "Each capability id must belong to the role template being applied.",
      }),
    );
  });

  it("rejects non-entitled capabilities in the subset (fail closed)", async () => {
    const { app, userAccessRepository } = await createTestApp({});

    const response = await app.inject({
      method: "POST",
      url: `/api/user-management/users/${USER_ID}/roles`,
      payload: {
        role_id: ROLE_ID,
        role_template_capability_ids: [CAP_EMP],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT",
      }),
    );
    await expect(userAccessRepository.listRoleTemplatesByUser(TENANT, USER_ID)).resolves.toHaveLength(
      0,
    );
  });
});

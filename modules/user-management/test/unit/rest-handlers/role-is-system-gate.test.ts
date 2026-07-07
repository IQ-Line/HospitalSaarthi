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

// #48 M3 — end-to-end proof that the platform-controlled `is_system` flag is gated on the
// verified principal being the platform super-admin, driving the REAL router wiring
// (getCanManageSystemFlag default -> isPlatformSuperAdminRequest -> handler -> use-case -> repo).
// Onboarding creates the tenant-admin system role as super-admin (honored); a tenant caller
// cannot self-mint / self-flip a system role (forced false).

const SEEDED_ROLE_ID = "22222222-2222-4222-8222-222222222222";

const apps: Array<ReturnType<typeof Fastify>> = [];

/** Stubs the identity plugin: attaches a verified principal with the given roles + platform scopes. */
function identityStub(roles: string[], scopes: string[]) {
  return fp(
    async (fastify) => {
      fastify.decorateRequest(
        "user",
        null as unknown as {
          userId: string;
          tenantId: string;
          orgId: string;
          roles: string[];
          scopes: string[];
          sessionId: string;
          iat: number;
          exp: number;
          iss: string;
        },
      );
      fastify.addHook("onRequest", async (request) => {
        request.correlationId = randomUUID();
        request.user = {
          userId: "f47ac10b-58cc-4372-a567-0e02b2c3d580",
          tenantId: "tenant-a",
          orgId: "f47ac10b-58cc-4372-a567-0e02b2c3d581",
          roles,
          scopes,
          sessionId: "session-1",
          iat: 1,
          exp: 9999999999,
          iss: "issuer",
        };
      });
    },
    { name: "@hims/ts-sdk-identity-stub" },
  );
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

async function createApp(roles: string[], scopes: string[] = []) {
  const app = Fastify();
  apps.push(app);

  const userRepository = new InMemoryUserRepository();
  const capabilityRepository = new InMemoryCapabilityRepository([]);
  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: "tenant-a",
      role: {
        id: SEEDED_ROLE_ID,
        code: "viewer",
        role_type: "staff",
        display_name: "Viewer",
        description: null,
        is_system: false,
        status: "active",
      },
    },
  ]);
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );
  const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
    userAccessRepository,
    roleRepository,
  );
  const principalAuthorizationRepository = new InMemoryPrincipalAuthorizationRepository();

  await app.register(identityStub(roles, scopes));
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
      });
    },
    { prefix: "/api/user-management" },
  );

  return { app, roleRepository };
}

describe("/roles is_system gate (end-to-end via the real router)", () => {
  it("honors is_system=true for a bounded platform operator (scope:platform, tenant onboarding)", async () => {
    const { app } = await createApp(["super-admin"], ["platform"]);
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/roles",
      payload: {
        code: "tenant-admin",
        role_type: "tenant-admin",
        display_name: "Tenant Administrator",
        is_system: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(expect.objectContaining({ code: "tenant-admin", is_system: true }));
  });

  it("forces is_system=false for a non-super-admin tenant caller, even when the body sets it true", async () => {
    const { app } = await createApp(["tenant-admin"]);
    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/roles",
      payload: {
        code: "escalated",
        role_type: "admin",
        display_name: "Escalation Attempt",
        is_system: true,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(expect.objectContaining({ code: "escalated", is_system: false }));
  });

  it("ignores a non-super-admin PATCH that tries to flip an existing role to is_system=true", async () => {
    const { app, roleRepository } = await createApp(["tenant-admin"]);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/user-management/roles/${SEEDED_ROLE_ID}`,
      payload: { is_system: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expect.objectContaining({ is_system: false }));
    expect((await roleRepository.getRoleById("tenant-a", SEEDED_ROLE_ID))?.is_system).toBe(false);
  });
});

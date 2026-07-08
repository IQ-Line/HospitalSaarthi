import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import {
  InMemoryCapabilityRepository,
  InMemoryPrincipalAuthorizationRepository,
  InMemoryPrincipalRoleProjectionRepository,
  InMemoryRoleCapabilityRepository,
  InMemoryRoleRepository,
  InMemoryUserAccessRepository,
  InMemoryUserProvisioningRepository,
  InMemoryUserRepository,
} from "../../../../modules/user-management/src/index.js";
import { createMasterDataModuleCatalogPortStub } from "../../../../modules/user-management/src/test-support/master-data-catalog-port-stub.js";
import { createDepartmentCatalogPortStub } from "../../../../modules/user-management/src/test-support/department-catalog-port-stub.js";
import { registerUserManagementApi } from "../../src/openapi/register-user-management-api.js";

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d590";

const apps: Array<ReturnType<typeof Fastify>> = [];

// Sets request.user like the real identity plugin would, so the PATCH route runs far enough to
// hit request-body schema validation. (Schema validation runs after onRequest, so the field
// stripping asserted below comes from the OpenAPI-derived body schema — the thing under test.)
const identityStubPlugin = fp(
  async (fastify) => {
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
      request.correlationId = randomUUID();
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

// Builds the app through registerUserManagementApi — the REAL production wiring that merges each
// route's request schema from the dereferenced OpenAPI bundle (`additionalProperties: false` on the
// PATCH /users/{id} body). This is deliberately NOT the bare module plugin: the module router
// attaches no body schema of its own, so the internal-field neutralization lives only in this wiring.
async function createApp(userRepository: InMemoryUserRepository) {
  const app = Fastify();
  apps.push(app);

  const roleRepository = new InMemoryRoleRepository();
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );

  await app.register(identityStubPlugin);
  await registerUserManagementApi(app, {
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
    capabilityRepository: new InMemoryCapabilityRepository(),
    roleRepository,
    roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
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
      async listTenantEnabledModuleIds() {
        return [];
      },
    },
    masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
    departmentCatalogPort: createDepartmentCatalogPortStub(),
  });

  return app;
}

describe("PATCH /users/:id neutralizes the internal-only must_change_password field", () => {
  it("does not let a client-supplied must_change_password mutate the stored flag", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER_ID, { full_name: "Target User" });
    // Seed the flag as TRUE. A client PATCH tries to flip it to false below; if the internal field
    // ever reached the handler (schema wiring dropped, or must_change_password added to the spec's
    // PATCH body), the stored flag WOULD change to false — making this test fail loudly.
    await userRepository.updateUser(TENANT, USER_ID, { must_change_password: true });

    const app = await createApp(userRepository);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/user-management/users/${USER_ID}`,
      payload: { full_name: "x", must_change_password: false },
    });

    // The declared part of the update still succeeds. The undeclared must_change_password is
    // stripped by the OpenAPI-derived body schema (`additionalProperties: false` + Fastify's
    // default ajv `removeAdditional`), so it never reaches updateUser().
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expect.objectContaining({ full_name: "x" }));

    // THE INVARIANT: the internal flag is untouched — still true, exactly as seeded. This is the
    // assertion that fails loud if the schema wiring is removed or the spec grows the field, because
    // then the client-supplied `false` would land and flip it.
    const reread = await userRepository.getUserById(TENANT, USER_ID);
    expect(reread?.must_change_password).toBe(true);
  });
});

import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryPartnerPrincipalRepository } from "../data-access/in-memory-partner-principal-repository.js";
import { userManagementPlugin } from "../router.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import { InMemoryUserProvisioningRepository } from "../data-access/in-memory-user-provisioning-repository.js";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";

const apps: Array<ReturnType<typeof Fastify>> = [];
const TENANT = "tenant-a";
const MODULE_ID = randomUUID();
const CAP_ID = randomUUID();
const INTEGRATION_ID = randomUUID();

const identityStubPlugin = fp(
  async (fastify) => {
    fastify.decorateRequest("user", null as unknown as { userId: string; tenantId: string });
    fastify.addHook("onRequest", async (request) => {
      request.correlationId = randomUUID();
      request.user = {
        userId: randomUUID(),
        tenantId: TENANT,
      } as never;
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
  await Promise.all(apps.map((app) => app.close().catch(() => undefined)));
  apps.length = 0;
});

async function createApp(partnerRepo = new InMemoryPartnerPrincipalRepository()) {
  const app = Fastify();
  apps.push(app);

  await app.register(identityStubPlugin);
  await app.register(
    async (instance) => {
      await instance.register(userManagementPlugin, {
        eventBus: noopEventBus,
        userRepository: new InMemoryUserRepository(),
        userProvisioningRepository: new InMemoryUserProvisioningRepository(),
        capabilityRepository: new InMemoryCapabilityRepository([
          {
            capability: {
              id: CAP_ID,
              capability_key: "integration:integration:read",
              module: "integration",
              feature: "integration",
              action: "read",
              display_name: "Read integrations",
              is_active: true,
              source_module_slug: "integration",
              source_permission_slug: "read",
              source_catalog: "master_data",
            },
          },
        ]),
        roleRepository: new InMemoryRoleRepository(),
        roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
        userAccessRepository: new InMemoryUserAccessRepository(),
        principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(),
        principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
        authAccountProvisioner: { async provision() {} },
        tenantModuleEntitlementPort: {
          listTenantEnabledModuleIds: async () => [MODULE_ID],
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: async () => new Map([[MODULE_ID, "integration"]]),
        }),
        partnerPrincipalRepository: partnerRepo,
      });
    },
    { prefix: "/api/user-management" },
  );

  return app;
}

describe("partner principal routes", () => {
  it("POST /partner-principals provisions a partner principal", async () => {
    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/user-management/partner-principals",
      headers: { "iq_tenant_id": TENANT },
      payload: {
        integration_id: INTEGRATION_ID,
        integration_display_name: "Smart Report",
        suggested_capability_keys: ["integration:integration:read"],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      kind: "partner",
      integration_id: INTEGRATION_ID,
      status: "active",
    });
  });

  it("POST deactivate returns 404 for unknown integration", async () => {
    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: `/api/user-management/partner-principals/${randomUUID()}/deactivate`,
      headers: { "iq_tenant_id": TENANT },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("PARTNER_PRINCIPAL_NOT_FOUND");
  });
});

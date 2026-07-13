import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import { userManagementPlugin } from "../router.js";
import { NoopPharmacyStoreAssignmentRepository } from "../test-support/noop-pharmacy-store-assignment-repository.js";
import { NoopUserProvisioningRepository } from "../test-support/noop-user-provisioning-repository.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import { createDepartmentCatalogPortStub } from "../test-support/department-catalog-port-stub.js";
import type {
  CapabilityRepository,
  PrincipalAuthorizationRepository,
  PrincipalRoleProjectionRepository,
  RoleCapabilityRepository,
  RoleRepository,
  UserAccessRepository,
  UserRepository,
} from "../ports/index.js";

const TENANT = "tenant-a";
const USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d650";
const PRIMARY_STORE = "5efaafca-be32-4eff-92a5-10c215427952";
const SECONDARY_STORE = "e56ca7d0-5cc8-4946-880f-933d19d6f033";

const identityStubPlugin = fp(async (fastify) => {
  fastify.decorateRequest("user", null as unknown as { tenantId: string; userId: string });
  fastify.addHook("onRequest", async (request) => {
    request.user = { tenantId: TENANT, userId: USER_ID };
  });
});

class StubUserRepository implements UserRepository {
  async createUser() {
    throw new Error("not implemented");
  }
  async getUserById() {
    return null;
  }
  async findUserByGlobalId() {
    return null;
  }
  async listUsers() {
    return [];
  }
  async updateUser() {
    return null;
  }
}

class StubCapabilityRepository implements CapabilityRepository {
  async getCapabilityById() {
    return null;
  }
  async listCapabilities() {
    return [];
  }
  async listCapabilitiesByIds() {
    return [];
  }
  async listCapabilitiesByKeys() {
    return [];
  }
  async listActiveRuntimeCapabilitiesByModuleSlugs() {
    return [];
  }
}

class StubRoleRepository implements RoleRepository {
  async getRoleById() {
    return null;
  }
  async listRoles() {
    return [];
  }
  async listRolesByIds() {
    return [];
  }
  async createRole() {
    throw new Error("not implemented");
  }
  async updateRole() {
    return null;
  }
  async deleteRole() {
    return null;
  }
}

class NoopRoleCapabilityRepository implements RoleCapabilityRepository {
  async listCapabilitiesByRole() {
    return [];
  }
  async replaceCapabilitiesForRole() {
    return [];
  }
}

class NoopUserAccessRepository implements UserAccessRepository {
  async applyRoleTemplate() {
    throw new Error("not implemented");
  }
  async detachRoleTemplate() {
    return null;
  }
  async listRoleTemplatesByUser() {
    return [];
  }
  async listActiveCapabilityGrantsByUser() {
    return [];
  }
  async replaceManualCapabilityGrants() {
    return [];
  }
}

class NoopPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser() {
    return [];
  }
  clearCache() {}
}

class NoopPrincipalAuthorizationRepository implements PrincipalAuthorizationRepository {
  async listEffectiveCapabilityKeys() {
    return [];
  }
  async getClearanceLevels() {
    return {};
  }
  async listDelegatedCapabilityKeys() {
    return [];
  }
}

class InMemoryPharmacyStoreAssignmentRepository extends NoopPharmacyStoreAssignmentRepository {
  async getForUser(_tenantId: string, _userId: string) {
    return {
      primary_store_id: PRIMARY_STORE,
      secondary_store_ids: [SECONDARY_STORE],
    };
  }
}

const noopEventBus = {
  async connect() {},
  async disconnect() {},
  async publish() {},
  async subscribe() {
    return { async unsubscribe() {} };
  },
};

describe("GET /auth/pharmacy-store-access", () => {
  const apps: Array<ReturnType<typeof Fastify>> = [];

  afterEach(async () => {
    while (apps.length > 0) {
      await apps.pop()?.close();
    }
  });

  it("returns assigned store ids for the current user", async () => {
    const app = Fastify();
    apps.push(app);
    await app.register(identityStubPlugin);
    await app.register(
      async (instance) => {
        await instance.register(userManagementPlugin, {
          eventBus: noopEventBus as never,
          userRepository: new StubUserRepository(),
          userProvisioningRepository: new NoopUserProvisioningRepository(),
          pharmacyStoreAssignmentRepository: new InMemoryPharmacyStoreAssignmentRepository(),
          capabilityRepository: new StubCapabilityRepository(),
          roleRepository: new StubRoleRepository(),
          roleCapabilityRepository: new NoopRoleCapabilityRepository(),
          userAccessRepository: new NoopUserAccessRepository(),
          principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
          principalAuthorizationRepository: new NoopPrincipalAuthorizationRepository(),
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
          accessTokenIssuer: {
            async issueForPlatformUser() {
              return {
                access_token: "token",
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: "refresh",
                refresh_expires_in: 86400,
              };
            },
          },
        });
      },
      { prefix: "/api/user-management" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/auth/pharmacy-store-access",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      primary_store_id: PRIMARY_STORE,
      secondary_store_ids: [SECONDARY_STORE],
    });
  });
});

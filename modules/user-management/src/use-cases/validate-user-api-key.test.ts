import { generateUserApiKeySecret } from "@hims/ts-sdk-api-key";
import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { ApiKeyInvalidError } from "../domain/errors.js";
import { TENANT_ADMIN_ROLE_CODE } from "../domain/tenant-admin.js";
import type { Role } from "../ports/index.js";
import { createDefaultPrincipalService } from "../services/default-principal-service.js";
import { createAccessTokenIssuerStub } from "../test-support/access-token-issuer-stub.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import { issueUserApiKey } from "./issue-user-api-key.js";
import { validateUserApiKey } from "./validate-user-api-key.js";

const TENANT = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const ROLE_ID = "33333333-3333-3333-3333-333333333333";
const OPD_MODULE = "44444444-4444-4444-4444-444444444444";

describe("validateUserApiKey", () => {
  it("returns user, principal, module slugs, and bearer token for a valid key", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId(TENANT, USER_ID, { full_name: "Tenant Admin" });

    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: TENANT,
        role: {
          id: ROLE_ID,
          code: TENANT_ADMIN_ROLE_CODE,
          display_name: "Tenant Admin",
          is_system: true,
          status: "active",
        } satisfies Role,
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    await userAccessRepository.applyRoleTemplate(TENANT, {
      userId: USER_ID,
      roleId: ROLE_ID,
      capabilityIds: [],
      actorId: null,
    });

    const { api_key_secret } = await issueUserApiKey(userRepository, TENANT, USER_ID);

    const result = await validateUserApiKey(
      {
        userRepository,
        principalService: createDefaultPrincipalService({
          userRepository,
          principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
            userAccessRepository,
            roleRepository,
          ),
          principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
        }),
        tenantModuleEntitlementPort: {
          async listTenantEnabledModuleIds() {
            return [OPD_MODULE];
          },
        },
        masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
          resolveModuleSlugsByIds: async () => new Map([[OPD_MODULE, "opd"]]),
        }),
        accessTokenIssuer: createAccessTokenIssuerStub(),
      },
      api_key_secret,
    );

    expect(result.user.id).toBe(USER_ID);
    expect(result.iq_tenant_id).toBe(TENANT);
    expect(result.principal.id).toBe(USER_ID);
    expect(result.enabled_module_slugs).toEqual(["opd"]);
    expect(result.access_token).toBe("test-access-token");
    expect(result.token_type).toBe("Bearer");
    expect(result.expires_in).toBe(300);
    expect(result.refresh_token).toBe("test-refresh-token");
    expect(result.refresh_expires_in).toBe(604_800);
  });

  it("rejects invalid API keys", async () => {
    const userRepository = new InMemoryUserRepository();
    await expect(
      validateUserApiKey(
        {
          userRepository,
          principalService: createDefaultPrincipalService({
            userRepository,
            principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
              new InMemoryUserAccessRepository(),
              new InMemoryRoleRepository(),
            ),
            principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
          }),
          tenantModuleEntitlementPort: {
            async listTenantEnabledModuleIds() {
              return [];
            },
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
          accessTokenIssuer: createAccessTokenIssuerStub(),
        },
        "not-a-valid-key",
      ),
    ).rejects.toBeInstanceOf(ApiKeyInvalidError);

    const { secret } = generateUserApiKeySecret("live");
    await expect(
      validateUserApiKey(
        {
          userRepository,
          principalService: createDefaultPrincipalService({
            userRepository,
            principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
              new InMemoryUserAccessRepository(),
              new InMemoryRoleRepository(),
            ),
            principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
          }),
          tenantModuleEntitlementPort: {
            async listTenantEnabledModuleIds() {
              return [];
            },
          },
          masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
          accessTokenIssuer: createAccessTokenIssuerStub(),
        },
        secret,
      ),
    ).rejects.toBeInstanceOf(ApiKeyInvalidError);
  });
});

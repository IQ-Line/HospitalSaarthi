/** POST/GET /auth/api-key/validate — empty JSON body + X-API-Key header. */

import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { TENANT_ADMIN_ROLE_CODE } from "../domain/tenant-admin.js";
import type { Role } from "../ports/index.js";
import {
  assertTenantHeaderAllowedForPrincipal,
  resolveEffectiveTenantId,
} from "../http/resolve-effective-tenant-id.js";
import { createDefaultPrincipalService } from "../services/default-principal-service.js";
import { createAccessTokenIssuerStub } from "../test-support/access-token-issuer-stub.js";
import { createMasterDataModuleCatalogPortStub } from "../test-support/master-data-catalog-port-stub.js";
import { issueUserApiKey } from "../use-cases/issue-user-api-key.js";
import { registerAuthHandlers } from "./auth-handlers.js";

const TENANT = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const ROLE_ID = "33333333-3333-3333-3333-333333333333";
const OPD_MODULE = "44444444-4444-4444-4444-444444444444";

async function createAppWithApiKey() {
  const app = Fastify();
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

  app.addHook("preHandler", async (request, reply) => {
    const authMode = (request.routeOptions?.config as { authMode?: string } | undefined)?.authMode;
    if (authMode === "public") return;
    const headerCheck = assertTenantHeaderAllowedForPrincipal(request);
    if (!headerCheck.ok) {
      return reply.status(403).send({ code: "TENANT_CONTEXT_MISMATCH" });
    }
  });

  registerAuthHandlers(app, {
    getTenantId: (request) => resolveEffectiveTenantId(request),
    getUserId: () => USER_ID,
    getUserDeps: { userRepository },
    validateUserApiKeyDeps: {
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
  });

  await app.ready();
  return { app, api_key_secret };
}

describe("POST /auth/api-key/validate", () => {
  it("accepts X-API-Key with Content-Type application/json and empty body", async () => {
    const { app, api_key_secret } = await createAppWithApiKey();

    const response = await app.inject({
      method: "POST",
      url: "/auth/api-key/validate",
      headers: {
        "content-type": "application/json",
        "x-api-key": api_key_secret,
      },
      payload: "",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { access_token: string; enabled_module_slugs: string[] };
    expect(body.access_token).toBe("test-access-token");
    expect(body.enabled_module_slugs).toEqual(["opd"]);

    await app.close();
  });
});

describe("GET /auth/api-key/validate", () => {
  it("validates API key from X-API-Key header only", async () => {
    const { app, api_key_secret } = await createAppWithApiKey();

    const response = await app.inject({
      method: "GET",
      url: "/auth/api-key/validate",
      headers: { "x-api-key": api_key_secret },
    });

    expect(response.statusCode).toBe(200);
    expect((response.json() as { refresh_token: string }).refresh_token).toBe("test-refresh-token");

    await app.close();
  });
});

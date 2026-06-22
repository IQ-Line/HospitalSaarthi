/** GET /auth/principal — enrichment + handler contract (no Cerbos PDP in this test). */

import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../../../src/data-access/in-memory-principal-authorization-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { resolveEffectiveTenantId } from "../../../src/http/resolve-effective-tenant-id.js";
import type { PrincipalRoleProjectionRepository } from "../../../src/ports/index.js";
import { principalRoleEnricherPlugin } from "../../../src/principal-role-enricher-plugin.js";
import { registerAuthHandlers } from "../../../src/rest-handlers/auth-handlers.js";
import { createDefaultPrincipalService } from "../../../src/services/default-principal-service.js";

class StubPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(_tenantId: string, _userId: string): Promise<string[]> {
    return ["platform_operator"];
  }
  clearCache(): void {}
}

const identityPluginStub = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      request.user = {
        userId: "user-1",
        tenantId: "tenant-a",
        orgId: "",
        roles: [],
        sessionId: "",
        iat: 1,
        exp: 9_999_999_999,
        iss: "http://localhost:3000",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

describe("GET /auth/principal", () => {
  it("returns id, roles, and attributes.capabilities from user_capabilities snapshots", async () => {
    const app = Fastify();

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "user-1", { full_name: "One" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability("tenant-a", "user-1", "users:users:read");
    authorization.seedCapability("tenant-a", "user-1", "master-data:shell:access");

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: authorization,
    });

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, { principalService, userRepository });
    registerAuthHandlers(app, {
      getTenantId: (request) => resolveEffectiveTenantId(request),
      getUserId: () => "user-1",
      getUserDeps: { userRepository },
      validateUserApiKeyDeps: {
        userRepository,
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
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/auth/principal",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      id: string;
      roles: string[];
      attributes: {
        capabilities: string[];
        delegated_capabilities: string[];
        iq_tenant_id: string;
        role_codes: string[];
      };
    };
    expect(body.id).toBe("user-1");
    expect(body.roles).toEqual(["platform_operator"]);
    expect(body.attributes.role_codes).toEqual(["platform_operator"]);
    expect(body.attributes.iq_tenant_id).toBe("tenant-a");
    expect(body.attributes.capabilities).toEqual(["master-data:shell:access", "users:users:read"]);
    expect(body.attributes.delegated_capabilities).toEqual([]);
    expect(body).not.toHaveProperty("permissions");
    expect(body).not.toHaveProperty("capabilityKeys");

    await app.close();
  });
});

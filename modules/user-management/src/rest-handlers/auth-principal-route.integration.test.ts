/** GET /auth/principal — enrichment + handler contract (no Cerbos PDP in this test). */

import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { InMemoryPrincipalAuthorizationRepository } from "../data-access/in-memory-principal-authorization-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { resolveEffectiveTenantId } from "../http/resolve-effective-tenant-id.js";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { principalRoleEnricherPlugin } from "../principal-role-enricher-plugin.js";
import { registerAuthHandlers } from "./auth-handlers.js";
import { createDefaultPrincipalService } from "../services/default-principal-service.js";

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
    authorization.seedCapability("tenant-a", "user-1", "um:user:read");
    authorization.seedCapability("tenant-a", "user-1", "md:shell:access");

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: authorization,
    });

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, { principalService });
    registerAuthHandlers(app, {
      getTenantId: (request) => resolveEffectiveTenantId(request),
      getUserId: () => "user-1",
      getUserDeps: { userRepository },
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
      };
    };
    expect(body.id).toBe("user-1");
    expect(body.roles).toEqual(["platform_operator"]);
    expect(body.attributes.iq_tenant_id).toBe("tenant-a");
    expect(body.attributes.capabilities).toEqual(["md:shell:access", "um:user:read"]);
    expect(body.attributes.delegated_capabilities).toEqual([]);
    expect(body).not.toHaveProperty("permissions");
    expect(body).not.toHaveProperty("capabilityKeys");

    await app.close();
  });
});

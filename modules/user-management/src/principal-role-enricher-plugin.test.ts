import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { authzPlugin } from "@hims/ts-sdk-authz";
import { InMemoryPrincipalAuthorizationRepository } from "./data-access/in-memory-principal-authorization-repository.js";
import { InMemoryUserRepository } from "./data-access/in-memory-user-repository.js";
import type { PrincipalRoleProjectionRepository } from "./ports/index.js";
import { principalRoleEnricherPlugin } from "./principal-role-enricher-plugin.js";
import { createDefaultPrincipalService } from "./services/default-principal-service.js";

class StubPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(_tenantId: string, _userId: string): Promise<string[]> {
    return ["doctor"];
  }
  clearCache(): void {}
}

const identityPluginStub = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      request.user = {
        userId: "user-1",
        tenantId: "tenant-a",
        orgId: "org-1",
        roles: [],
        sessionId: "session-1",
        iat: 1,
        exp: 9999999999,
        iss: "issuer",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

const CERBOS_ROUTE_PROBE_USER_ID = "00000000-0000-0000-0000-000000000000";

describe("principalRoleEnricherPlugin", () => {
  it("enriched principal roles reach authz resolver context", async () => {
    const app = Fastify();
    let seenRoles: string[] = [];

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "user-1", { full_name: "One" });
    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
    });

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, {
      principalService,
    });
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
      resolveTarget: (request) => {
        if (request.user.userId === CERBOS_ROUTE_PROBE_USER_ID) {
          return { kind: "user", id: "probe", action: "user.read" };
        }
        if (request.user.userId === "probe-user") {
          return { kind: "user", id: "probe-user", action: "user.read" };
        }
        seenRoles = [...request.user.roles];
        throw new Error("resolver-short-circuit");
      },
    });

    app.get(
      "/users/:id",
      { config: { authMode: "protected" } },
      async () => ({ ok: true }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/users/user-1",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).toBe(500);
    expect(seenRoles).toEqual(["doctor"]);

    await app.close();
  });

  it("capabilities reach request.user.capabilities and cerbosPrincipal", async () => {
    const app = Fastify();
    let seenCapabilities: string[] = [];
    let seenCerbosCaps: string[] = [];

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "user-1", { full_name: "One" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability("tenant-a", "user-1", "um:user:create");
    authorization.seedCapability("tenant-a", "user-1", "um:user:read");

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: authorization,
    });

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, { principalService });
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
      resolveTarget: (request) => {
        if (request.user.userId === CERBOS_ROUTE_PROBE_USER_ID) {
          return { kind: "user", id: "probe", action: "user.read" };
        }
        if (request.user.userId === "probe-user") {
          return { kind: "user", id: "probe-user", action: "user.read" };
        }
        seenCapabilities = [...(request.user.capabilities ?? [])];
        seenCerbosCaps = [...(request.cerbosPrincipal?.attributes.capabilities ?? [])];
        throw new Error("resolver-short-circuit");
      },
    });

    app.get("/users/:id", { config: { authMode: "protected" } }, async () => ({ ok: true }));

    await app.inject({
      method: "GET",
      url: "/users/user-1",
      headers: { authorization: "Bearer test-token" },
    });

    expect(seenCapabilities).toEqual(["um:user:create", "um:user:read"]);
    expect(seenCerbosCaps).toEqual(["um:user:create", "um:user:read"]);

    await app.close();
  });
});

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

const superAdminCrossTenantIdentityStub = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      request.user = {
        userId: "user-1",
        tenantId: "tenant-home",
        orgId: "org-1",
        roles: ["super-admin"],
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
      userRepository,
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

  it("keeps JWT super-admin role after DB projection enrichment", async () => {
    const app = Fastify();
    let seenRoles: string[] = [];

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-home", "user-1", { full_name: "Platform Op" });

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
    });

    await app.register(superAdminCrossTenantIdentityStub);
    await app.register(principalRoleEnricherPlugin, { principalService, userRepository });
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

    app.get("/users/:id", { config: { authMode: "protected" } }, async () => ({ ok: true }));

    await app.inject({
      method: "GET",
      url: "/users/user-1",
      headers: { authorization: "Bearer test-token" },
    });

    expect(seenRoles).toEqual(["doctor", "super-admin"]);

    await app.close();
  });

  it("capabilities reach request.user.capabilities and cerbosPrincipal", async () => {
    const app = Fastify();
    let seenCapabilities: string[] = [];
    let seenCerbosCaps: string[] = [];

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "user-1", { full_name: "One" });

    const authorization = new InMemoryPrincipalAuthorizationRepository();
    authorization.seedCapability("tenant-a", "user-1", "users:users:create");
    authorization.seedCapability("tenant-a", "user-1", "users:users:read");

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: authorization,
    });

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, { principalService, userRepository });
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

    expect(seenCapabilities).toEqual(["users:users:create", "users:users:read"]);
    expect(seenCerbosCaps).toEqual(["users:users:create", "users:users:read"]);

    await app.close();
  });

  it("resolves platform user id when JWT sub is auth_user_id", async () => {
    const app = Fastify();
    let enrichedUserId = "";

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-home", "platform-user-1", {
      full_name: "Platform Op",
    });
    await userRepository.updateUser("tenant-home", "platform-user-1", {
      auth_user_id: "auth-user-9",
    });

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
    });

    const authIdentityStub = fp(
      async (fastify) => {
        fastify.addHook("onRequest", async (request) => {
          request.user = {
            userId: "auth-user-9",
            tenantId: "tenant-home",
            orgId: "org-1",
            roles: ["super-admin"],
            sessionId: "session-1",
            iat: 1,
            exp: 9999999999,
            iss: "issuer",
          };
        });
      },
      { name: "@hims/ts-sdk-identity" },
    );

    await app.register(authIdentityStub);
    await app.register(principalRoleEnricherPlugin, { principalService, userRepository });
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
      resolveTarget: (request) => {
        if (request.user.userId === CERBOS_ROUTE_PROBE_USER_ID) {
          return { kind: "user", id: "probe", action: "user.read" };
        }
        enrichedUserId = request.cerbosPrincipal?.id ?? "";
        throw new Error("resolver-short-circuit");
      },
    });

    app.get("/users/:id", { config: { authMode: "protected" } }, async () => ({ ok: true }));

    await app.inject({
      method: "GET",
      url: "/users/platform-user-1",
      headers: { authorization: "Bearer test-token" },
    });

    expect(enrichedUserId).toBe("platform-user-1");

    await app.close();
  });

  it("enriches principal from JWT home tenant when super-admin scopes iq_tenant_id elsewhere", async () => {
    const app = Fastify();
    let enriched = false;

    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-home", "user-1", { full_name: "Platform Op" });
    // No row in tenant-other — would fail if enrichment used effective tenant header.

    const principalService = createDefaultPrincipalService({
      userRepository,
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
      principalAuthorizationRepository: new InMemoryPrincipalAuthorizationRepository(),
    });

    await app.register(superAdminCrossTenantIdentityStub);
    await app.register(principalRoleEnricherPlugin, { principalService, userRepository });
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
      resolveTarget: (request) => {
        if (request.user.userId === CERBOS_ROUTE_PROBE_USER_ID) {
          return { kind: "user", id: "probe", action: "user.read" };
        }
        if (request.user.userId === "probe-user") {
          return { kind: "user", id: "probe-user", action: "user.read" };
        }
        enriched = true;
        throw new Error("resolver-short-circuit");
      },
    });

    app.get("/roles", { config: { authMode: "protected" } }, async () => ({ ok: true }));

    const response = await app.inject({
      method: "GET",
      url: "/roles",
      headers: {
        authorization: "Bearer test-token",
        iq_tenant_id: "tenant-other",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(enriched).toBe(true);

    await app.close();
  });
});

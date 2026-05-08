import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { authzPlugin } from "@hims/ts-sdk-authz";
import type { PrincipalRoleProjectionRepository } from "./ports/index.js";
import { principalRoleEnricherPlugin } from "./principal-role-enricher-plugin.js";

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

describe("principalRoleEnricherPlugin", () => {
  it("enriched principal roles reach authz resolver context", async () => {
    const app = Fastify();
    let seenRoles: string[] = [];

    await app.register(identityPluginStub);
    await app.register(principalRoleEnricherPlugin, {
      principalRoleProjectionRepository: new StubPrincipalRoleProjectionRepository(),
    });
    await app.register(authzPlugin, {
      cerbosUrl: "127.0.0.1:3593",
      resolveTarget: (request) => {
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
});

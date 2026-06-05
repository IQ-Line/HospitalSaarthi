import Fastify from "fastify";
import fp from "fastify-plugin";
import { describe, expect, it } from "vitest";
import { principalEnrichmentPlugin } from "./principal-enrichment-plugin.js";

const partnerIdentityStub = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      request.user = {
        userId: "partner-1",
        tenantId: "tenant-a",
        orgId: "",
        roles: [],
        sessionId: "",
        kind: "partner",
        capabilities: ["empi:patient:read"],
        iat: 1,
        exp: 9999999999,
        iss: "partner-issuer",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

describe("principalEnrichmentPlugin partner skip", () => {
  it("skips DB enrichment and trusts JWT capabilities for kind=partner", async () => {
    const app = Fastify();
    let dbLookupCalled = false;

    await app.register(partnerIdentityStub);
    await app.register(principalEnrichmentPlugin, {
      principalService: {
        async getPrincipal() {
          dbLookupCalled = true;
          throw new Error("should not call principalService for partner");
        },
      },
      userRepository: {
        async findUserByGlobalId() {
          dbLookupCalled = true;
          return null;
        },
      } as never,
    });

    app.get("/probe", async (request) => ({
      capabilities: request.user.capabilities,
      cerbosCapabilities: request.cerbosPrincipal?.attributes.capabilities,
    }));

    const res = await app.inject({ method: "GET", url: "/probe" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      capabilities: ["empi:patient:read"],
      cerbosCapabilities: ["empi:patient:read"],
    });
    expect(dbLookupCalled).toBe(false);

    await app.close();
  });
});

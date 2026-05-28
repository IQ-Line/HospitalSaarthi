import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";

const cerbosCheckResource = vi.fn();

type StubPrincipal = {
  userId: string;
  tenantId: string;
  orgId: string;
  roles: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
};

vi.mock("./client.js", () => ({
  closeCerbosClient: vi.fn(),
  getCerbosClient: vi.fn(() => ({
    checkResource: cerbosCheckResource,
    planResources: vi.fn(),
  })),
}));

const { authzPlugin } = await import("./plugin.js");

const apps: Array<ReturnType<typeof Fastify>> = [];

const identityStubPlugin = fp(
  async (fastify) => {
    fastify.decorateRequest("user", null as unknown as StubPrincipal);
    fastify.addHook("onRequest", async (request) => {
      request.user = {
        userId: "user-1",
        tenantId: "tenant-a",
        orgId: "",
        roles: [],
        sessionId: "",
        iat: 1,
        exp: 9999999999,
        iss: "issuer",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

const principalEnrichmentStubPlugin = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      (request as Record<string, unknown>).cerbosPrincipal = {
        id: "user-1",
        roles: [],
        attributes: {
          iq_tenant_id: "tenant-a",
          department: null,
          org_id: null,
          role_codes: [],
          capabilities: [],
          delegated_capabilities: [],
          clearances: {},
          um_clearance_effective_tier: 0,
        },
      };
    });
  },
  {
    name: "@hims/user-management-principal-enrichment",
    dependencies: ["@hims/ts-sdk-identity"],
  },
);

afterEach(async () => {
  cerbosCheckResource.mockReset();
  await Promise.all(
    apps.map(async (app) => {
      try {
        await app.close();
      } catch {
        // Best-effort close keeps test isolation simple.
      }
    }),
  );
  apps.length = 0;
});

describe("authzPlugin", () => {
  it("uses a fallback Cerbos role for authenticated principals with no roles", async () => {
    const app = Fastify();
    apps.push(app);

    cerbosCheckResource.mockResolvedValue({
      isAllowed: () => false,
    });

    await app.register(identityStubPlugin);
    await app.register(principalEnrichmentStubPlugin);
    await app.register(authzPlugin, {
      cerbosUrl: "localhost:3593",
      resolveTarget: async () => ({
        kind: "role",
        id: "list",
        action: "role.read",
      }),
    });

    app.get("/protected", { config: { authMode: "protected" } }, async () => ({ ok: true }));

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: {
        authorization: "Bearer test-token",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(cerbosCheckResource).toHaveBeenCalledTimes(1);
    expect(cerbosCheckResource.mock.calls[0]?.[0]?.principal?.roles).toEqual([
      "__hims_authenticated__",
    ]);
  });

  it("skips Cerbos for routes that are not authMode protected", async () => {
    const app = Fastify();
    apps.push(app);

    await app.register(identityStubPlugin);
    await app.register(principalEnrichmentStubPlugin);
    await app.register(authzPlugin, {
      cerbosUrl: "localhost:3593",
      resolveTarget: async () => null,
    });

    app.get("/docs", async () => ({ ok: true }));
    app.get("/public-route", { config: { authMode: "public" } }, async () => ({ ok: true }));

    const docsResponse = await app.inject({ method: "GET", url: "/docs" });
    const publicResponse = await app.inject({ method: "GET", url: "/public-route" });

    expect(docsResponse.statusCode).toBe(200);
    expect(publicResponse.statusCode).toBe(200);
    expect(cerbosCheckResource).not.toHaveBeenCalled();
  });
});

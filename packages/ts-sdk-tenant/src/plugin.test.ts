import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { tenantPlugin } from "./plugin.js";

const apps: ReturnType<typeof Fastify>[] = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close().catch(() => undefined)));
  apps.length = 0;
});

async function createApp(tenantSource: "jwt" | "header-or-jwt") {
  const app = Fastify();
  apps.push(app);

  app.decorateRequest("user", undefined as unknown as { tenantId: string });
  app.addHook("onRequest", async (request) => {
    request.user = { tenantId: "tenant-from-jwt" } as never;
  });

  await app.register(tenantPlugin, { tenantSource });
  app.get("/resource", async (request) => ({ tenantId: request.tenantId }));

  return app;
}

describe("tenantPlugin", () => {
  it("jwt mode binds tenant from JWT and ignores absent header", async () => {
    const app = await createApp("jwt");
    const response = await app.inject({ method: "GET", url: "/resource" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ tenantId: "tenant-from-jwt" });
  });

  it("jwt mode returns AUTH_TENANT_MISMATCH when header conflicts with JWT", async () => {
    const app = await createApp("jwt");
    const response = await app.inject({
      method: "GET",
      url: "/resource",
      headers: { "iq_tenant_id": "other-tenant" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("AUTH_TENANT_MISMATCH");
  });

  it("header-or-jwt mode prefers header tenant", async () => {
    const app = await createApp("header-or-jwt");
    const response = await app.inject({
      method: "GET",
      url: "/resource",
      headers: { "x-tenant-id": "header-tenant" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ tenantId: "header-tenant" });
  });

  it("header-or-jwt mode falls back to JWT tenant when header is absent", async () => {
    const app = await createApp("header-or-jwt");
    const response = await app.inject({ method: "GET", url: "/resource" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ tenantId: "tenant-from-jwt" });
  });
});

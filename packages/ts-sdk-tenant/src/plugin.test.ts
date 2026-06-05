import Fastify from "fastify";
import fp from "fastify-plugin";
import { afterEach, describe, expect, it } from "vitest";
import { tenantPlugin } from "./plugin.js";

const identityStub = fp(
  async (fastify) => {
    fastify.addHook("onRequest", async (request) => {
      (request as { user?: { tenantId: string; iq_tenant_id: string } }).user = {
        tenantId: "tenant-jwt",
        iq_tenant_id: "tenant-jwt",
      };
    });
  },
  { name: "@hims/ts-sdk-identity" },
);

describe("tenantPlugin", () => {
  afterEach(() => {
    // no-op
  });

  it("tenantSource=jwt uses JWT tenant and rejects header mismatch with 403", async () => {
    const app = Fastify();
    await app.register(identityStub);
    await app.register(tenantPlugin, { tenantSource: "jwt" });
    app.get("/api/test", async (request) => ({ tenantId: request.tenantId }));
    await app.ready();

    const ok = await app.inject({
      method: "GET",
      url: "/api/test",
      headers: { iq_tenant_id: "tenant-jwt" },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ tenantId: "tenant-jwt" });

    const mismatch = await app.inject({
      method: "GET",
      url: "/api/test",
      headers: { iq_tenant_id: "tenant-spoof" },
    });
    expect(mismatch.statusCode).toBe(403);
    expect(mismatch.json()).toMatchObject({ code: "AUTH_TENANT_MISMATCH" });

    await app.close();
  });

  it("tenantSource=jwt uses JWT tenant when header omitted", async () => {
    const app = Fastify();
    await app.register(identityStub);
    await app.register(tenantPlugin, { tenantSource: "jwt" });
    app.get("/api/test", async (request) => ({ tenantId: request.tenantId }));
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: "tenant-jwt" });

    await app.close();
  });
});

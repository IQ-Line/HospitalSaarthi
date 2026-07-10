import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { configuratorPublicTenantReadAuthPlugin } from "../../../src/http/configurator-public-tenant-read-auth-plugin.js";

const tenantId = "94478596-14d1-4e7e-b8d2-2995c61c3c90";
const JWKS_PATH = "/.well-known/jwks.json";
const ISSUER = "https://auth.hims.test";
const AUDIENCE = "hims-platform";

async function buildPublicTenantReadAuthTestApp() {
  const app = Fastify();

  await app.register(configuratorPublicTenantReadAuthPlugin);
  await app.register(identityPlugin, {
    jwksUrl: `${ISSUER}${JWKS_PATH}`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  await app.register(
    async (api) => {
      api.get("/tenants", async () => ({ route: "list" }));
      api.get("/tenants/:id", async () => ({ route: "get-by-id" }));
      api.get("/tenants/:tenantId/modules", async () => ({ route: "modules" }));
      api.get("/tenants/:tenantId/modules/:moduleId", async () => ({ route: "module-by-id" }));
      api.post("/tenants", async () => ({ route: "create" }));
      api.post("/tenants/:tenantId/modules", async () => ({ route: "create-module" }));
    },
    { prefix: "/api/configurator/v1" },
  );

  await app.ready();
  return app;
}

describe("configurator public tenant read routes skip JWT identity", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  const publicGetRoutes = [
    { label: "tenant list", url: "/api/configurator/v1/tenants" },
    {
      label: "tenant list filtered",
      url: "/api/configurator/v1/tenants?provisioning_status=active",
    },
    { label: "tenant by id", url: `/api/configurator/v1/tenants/${tenantId}` },
    {
      label: "tenant modules list",
      url: `/api/configurator/v1/tenants/${tenantId}/modules`,
    },
  ] as const;

  it.each(publicGetRoutes)(
    "GET $label does not require bearer",
    async ({ url }) => {
      const app = await buildPublicTenantReadAuthTestApp();
      apps.push(app);
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode).not.toBe(401);
      expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
      expect(res.statusCode).toBe(200);
    },
  );

  it("GET tenant module by id still requires bearer", async () => {
    const app = await buildPublicTenantReadAuthTestApp();
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/configurator/v1/tenants/${tenantId}/modules/mod-1`,
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toMatchObject({ code: "AUTH_MISSING_BEARER" });
  });

  it("POST tenant modules still requires bearer", async () => {
    const app = await buildPublicTenantReadAuthTestApp();
    apps.push(app);
    const res = await app.inject({
      method: "POST",
      url: `/api/configurator/v1/tenants/${tenantId}/modules`,
      payload: { module_id: "billing" },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toMatchObject({ code: "AUTH_MISSING_BEARER" });
  });
});

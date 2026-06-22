import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import type { TenantApiKeyValidatorPort } from "../../../src/ports/tenant-api-key-validator.js";
import { tenantApiKeyAuthPlugin } from "../../../src/http/tenant-api-key-auth-plugin.js";

const tenantId = "983934e8-f61c-4514-b8ec-df5ac7a6f02b";
const userId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const JWKS_PATH = "/.well-known/jwks.json";
const ISSUER = "https://auth.hims.test";
const AUDIENCE = "hims-platform";

const validator: TenantApiKeyValidatorPort = {
  validateOpdSlipKey: vi.fn(async () => null),
};

async function buildUmPublicReadAuthTestApp() {
  const app = Fastify();

  await app.register(tenantApiKeyAuthPlugin, { validator });
  await app.register(identityPlugin, {
    jwksUrl: `${ISSUER}${JWKS_PATH}`,
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  await app.register(
    async (api) => {
      api.get("/users", async () => ({ route: "users" }));
      api.get("/roles", async () => ({ route: "roles" }));
      api.get("/users/:id/roles", async () => ({ route: "user-roles" }));
    },
    { prefix: "/api/user-management" },
  );

  await app.ready();
  return app;
}

describe("UM tenant-scoped read routes skip JWT identity", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  const publicGetRoutes = [
    { label: "users", url: "/api/user-management/users" },
    { label: "roles", url: "/api/user-management/roles" },
    {
      label: "user roles",
      url: `/api/user-management/users/${userId}/roles`,
    },
  ] as const;

  it.each(publicGetRoutes)(
    "GET $label with iq_tenant_id header does not require bearer",
    async ({ url }) => {
      const app = await buildUmPublicReadAuthTestApp();
      apps.push(app);
      const res = await app.inject({
        method: "GET",
        url,
        headers: { iq_tenant_id: tenantId },
      });
      expect(res.statusCode).not.toBe(401);
      expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
      expect(res.statusCode).toBe(200);
    },
  );

  it("GET /roles with x-tenant-id header does not require bearer", async () => {
    const app = await buildUmPublicReadAuthTestApp();
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/user-management/roles",
      headers: { "x-tenant-id": tenantId },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
  });

  it("GET /roles with iq_tenant_id query does not require bearer", async () => {
    const app = await buildUmPublicReadAuthTestApp();
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: `/api/user-management/roles?iq_tenant_id=${tenantId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
  });

  it("GET /roles without tenant returns TENANT_HEADER_REQUIRED (not AUTH_MISSING_BEARER)", async () => {
    const app = await buildUmPublicReadAuthTestApp();
    apps.push(app);
    const res = await app.inject({
      method: "GET",
      url: "/api/user-management/roles",
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toMatchObject({ code: "TENANT_HEADER_REQUIRED" });
  });
});

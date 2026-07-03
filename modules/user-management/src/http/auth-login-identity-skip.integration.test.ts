import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import { tenantApiKeyAuthPlugin } from "./tenant-api-key-auth-plugin.js";
import type { TenantApiKeyValidatorPort } from "../ports/tenant-api-key-validator.js";

const UM_IDENTITY_SKIP_PATH_PREFIXES = [
  "/api/auth",
  "/api/user-management/auth/api-key",
  "/api/user-management/auth/login",
] as const;

const validator: TenantApiKeyValidatorPort = {
  validateOpdSlipKey: async () => null,
};

async function buildLoginSkipTestApp(): Promise<FastifyInstance> {
  const app = Fastify();

  await app.register(tenantApiKeyAuthPlugin, { validator });
  await app.register(identityPlugin, {
    jwksUrl: "https://auth.hims.test/.well-known/jwks.json",
    issuer: "https://auth.hims.test",
    audience: "hims-platform",
    skipPathPrefixes: [...UM_IDENTITY_SKIP_PATH_PREFIXES, "/docs"],
  });

  await app.register(
    async (api) => {
      api.post("/auth/login", { config: { authMode: "public" } }, async () => ({
        ok: true,
      }));
    },
    { prefix: "/api/user-management" },
  );

  await app.ready();
  return app;
}

describe("POST /api/user-management/auth/login skips JWT identity", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("does not require Authorization bearer", async () => {
    const app = await buildLoginSkipTestApp();
    apps.push(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/user-management/auth/login",
      headers: { "content-type": "application/json" },
      payload: { identifier: "admin@example.com", password: "secret" },
    });

    expect(res.statusCode).not.toBe(401);
    expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
    expect(res.statusCode).toBe(200);
  });
});

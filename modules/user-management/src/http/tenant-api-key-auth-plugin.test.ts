import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TenantApiKeyValidatorPort } from "../ports/tenant-api-key-validator.js";
import { tenantApiKeyAuthPlugin } from "./tenant-api-key-auth-plugin.js";

const apps: ReturnType<typeof Fastify>[] = [];

afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

function createValidator(
  result: TenantApiKeyValidatorPort["validateOpdSlipKey"] extends (
    ...args: infer _A
  ) => infer R
    ? Awaited<R>
    : never,
): TenantApiKeyValidatorPort {
  return {
    validateOpdSlipKey: vi.fn().mockResolvedValue(result),
  };
}

async function listenWithPlugin(validator: TenantApiKeyValidatorPort) {
  const app = Fastify();
  apps.push(app);
  await app.register(tenantApiKeyAuthPlugin, { validator });
  app.get("/api/user-management/roles", async (request) => ({
    authViaApiKey: request.authViaApiKey,
    tenantId: request.tenantId,
  }));
  app.get("/api/user-management/users", async (request) => ({
    authViaApiKey: request.authViaApiKey,
    tenantId: request.tenantId,
  }));
  app.post("/api/user-management/users", async () => ({ ok: true }));
  await app.ready();
  return app;
}

const VALID_TEST_API_KEY = "hs_opd_live_0123456789abcdefghijklmnopqrstuv";

describe("tenantApiKeyAuthPlugin", () => {
  it("authenticates GET /roles with a valid X-API-Key", async () => {
    const validator = createValidator({
      tenantId: "983934e8-f61c-4514-b8ec-df5ac7a6f02b",
      apiKeyId: "key-1",
      purpose: "opd_slip",
    });
    const app = await listenWithPlugin(validator);

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/roles",
      headers: { "x-api-key": VALID_TEST_API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authViaApiKey: true,
      tenantId: "983934e8-f61c-4514-b8ec-df5ac7a6f02b",
    });
    expect(validator.validateOpdSlipKey).toHaveBeenCalled();
  });

  it("rejects invalid X-API-Key on supported read routes", async () => {
    const validator = createValidator(null);
    const app = await listenWithPlugin(validator);

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/users",
      headers: { "x-api-key": "bad-key" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("ignores X-API-Key on unsupported routes", async () => {
    const validator = createValidator(null);
    const app = await listenWithPlugin(validator);

    const response = await app.inject({
      method: "POST",
      url: "/api/user-management/users",
      headers: { "x-api-key": VALID_TEST_API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(validator.validateOpdSlipKey).not.toHaveBeenCalled();
  });

  it("allows GET without X-API-Key to fall through to JWT layer", async () => {
    const validator = createValidator(null);
    const app = await listenWithPlugin(validator);

    const response = await app.inject({
      method: "GET",
      url: "/api/user-management/roles",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authViaApiKey: false,
      tenantId: "",
    });
    expect(validator.validateOpdSlipKey).not.toHaveBeenCalled();
  });
});

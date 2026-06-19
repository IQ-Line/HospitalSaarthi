import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { identityPlugin } from "@hims/ts-sdk-identity";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../ports.js";
import { registerTenantIntegrationProfilesHandler } from "../rest-handlers/tenant-integration-profiles.handler.js";
import { registerInternalTenantEntitlementHandler } from "../rest-handlers/internal-tenant-entitlement.handler.js";
import {
  CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES,
  CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS,
} from "./configurator-identity-skip-paths.js";

const tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
const hipId = "IN3610001625";
const INTERNAL_KEY = "configurator-internal-test-key";
const UM_INTERNAL_KEY = "um-internal-test-key";
const JWKS_PATH = "/.well-known/jwks.json";
const ISSUER = "https://auth.hims.test";
const AUDIENCE = "hims-platform";

vi.mock("../use-cases/list-entitlement-enabled-module-ids.js", () => ({
  listEntitlementEnabledModuleIds: vi.fn(async () => [
    { module_id: "abdm", is_active: true },
  ]),
}));

function mockProfilesRepo(): TenantIntegrationProfilesRepo {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    findActiveByTenantId: vi.fn(async () => undefined),
    findActiveByHipId: vi.fn(async () => undefined),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function mockTenantRepo(): TenantRepo {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

async function buildConfiguratorAuthTestApp() {
  const app = Fastify();
  const profilesRepo = mockProfilesRepo();
  const tenantRepo = mockTenantRepo();

  await app.register(identityPlugin, {
    jwksUrl: `${ISSUER}${JWKS_PATH}`,
    issuer: ISSUER,
    audience: AUDIENCE,
    skipPathPrefixes: [...CONFIGURATOR_IDENTITY_SKIP_PATH_PREFIXES],
  });

  await app.register(
    async (api) => {
      registerTenantIntegrationProfilesHandler(api, {
        tenantIntegrationProfilesRepo: profilesRepo,
        tenantRepo,
      });
      registerInternalTenantEntitlementHandler(api, {
        db: {} as never,
      });
    },
    { prefix: "/api/configurator/v1" },
  );

  await app.ready();
  return { app, profilesRepo };
}

describe("configurator internal S2S routes skip JWT identity", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      CONFIGURATOR_INTERNAL_API_KEY: INTERNAL_KEY,
      UM_INTERNAL_API_KEY: UM_INTERNAL_KEY,
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("by-tenant profile lookup does not require bearer (integration-hub M1)", async () => {
    const { app } = await buildConfiguratorAuthTestApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `${CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS.byTenant(tenantId)}?integration_kind=abdm`,
        headers: { "x-configurator-internal-key": INTERNAL_KEY },
      });
      expect(res.statusCode).not.toBe(401);
      expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("by-hip profile lookup does not require bearer (integration-hub M2/M3 callbacks)", async () => {
    const { app } = await buildConfiguratorAuthTestApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `${CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS.byHip(hipId)}?integration_kind=abdm`,
        headers: { "x-configurator-internal-key": INTERNAL_KEY },
      });
      expect(res.statusCode).not.toBe(401);
      expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("rejects by-tenant without internal key with 403 (not 401) when key is configured", async () => {
    const { app } = await buildConfiguratorAuthTestApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `${CONFIGURATOR_INTERNAL_INTEGRATION_PROFILE_PATHS.byTenant(tenantId)}?integration_kind=abdm`,
      });
      expect(res.statusCode).toBe(403);
      expect(res.body).toContain("x-configurator-internal-key");
    } finally {
      await app.close();
    }
  });

  it("internal tenant entitlement route does not require bearer (user-management S2S)", async () => {
    const { app } = await buildConfiguratorAuthTestApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `/api/configurator/v1/internal/tenants/${tenantId}/enabled-module-ids`,
        headers: { "x-um-internal-key": UM_INTERNAL_KEY },
      });
      expect(res.statusCode).not.toBe(401);
      expect(JSON.parse(res.body)).not.toMatchObject({ code: "AUTH_MISSING_BEARER" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: Array<{ module_id: string }> };
      expect(body.data[0]?.module_id).toBe("abdm");
    } finally {
      await app.close();
    }
  });

  it("tenant integration-profiles CRUD list still requires bearer", async () => {
    const { app } = await buildConfiguratorAuthTestApp();
    try {
      const res = await app.inject({
        method: "GET",
        url: `/api/configurator/v1/tenants/${tenantId}/integration-profiles`,
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { code: string };
      expect(body.code).toBe("AUTH_MISSING_BEARER");
    } finally {
      await app.close();
    }
  });
});

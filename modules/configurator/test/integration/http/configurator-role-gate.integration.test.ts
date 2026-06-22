import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerTenantIntegrationProfilesHandler } from "../../../src/rest-handlers/tenant-integration-profiles.handler.js";
import { registerTenantModulesHandler } from "../../../src/rest-handlers/tenant-modules.handler.js";
import type {
  TenantIntegrationProfilesRepo,
  TenantModuleRepo,
  TenantRepo,
} from "../../../src/ports.js";
import type { TenantIntegrationProfile } from "../../../src/domain/tenant-integration-profile.types.js";
import type { Tenant } from "../../../src/domain/tenant.types.js";
import type { TenantModule } from "../../../src/domain/tenant-module.types.js";

// ---------------------------------------------------------------------------
// Proves the configurator role-gate fixes (vet 2026-06-22, configurator P2 + P5):
//   - integration-profile management routes require platform super-admin (403 otherwise)
//   - those responses NEVER carry the stored client_secret (redacted to null)
//   - the internal S2S by-hip route STILL returns the secret (integration-hub needs it)
//   - POST /tenants/:id/modules is role-consistent with PATCH/DELETE (super-admin only)
//
// Auth note: no identity plugin is registered, so `getRequestAuthContext` falls back to
// reading the (unverified) Bearer JWT payload — exactly the ENABLE_AUTH-off code path.
// We exercise the real `assertPlatformSuperAdmin` + real redaction, not a stub.
// ---------------------------------------------------------------------------

const TENANT_ID = "94478596-14d1-4e7e-b8d2-2995c61c3c90";
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";
const INTERNAL_KEY = "test-internal-key";
const STORED_SECRET = "abdm-client-secret-DO-NOT-LEAK";

function bearer(payload: Record<string, unknown>): string {
  const seg = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `Bearer hdr.${seg}.sig`;
}

const superAdmin = bearer({ sub: "admin-1", roles: ["super-admin"] });
const clerk = bearer({ sub: "clerk-1", roles: ["front-desk"] });

const storedProfile: TenantIntegrationProfile = {
  id: PROFILE_ID,
  iq_tenant_id: TENANT_ID,
  integration_kind: "abdm",
  is_active: true,
  hip_id: "HIP-1",
  hiu_id: "HIU-1",
  cm_id: "sbx",
  client_id: "abdm-client-id",
  client_secret: STORED_SECRET,
  default_sms_phone: null,
  hip_display_name: "Test HIP",
  callback_base_url: null,
  sms_provider: null,
  sms_config: {},
  gateway_environment: "sandbox",
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
};

const sampleTenant: Tenant = {
  iq_tenant_id: TENANT_ID,
  org_id: "33333333-3333-4333-8333-333333333333",
  parent_tenant_id: null,
  name: "Test Tenant",
  slug: "test-tenant",
  type: "full_platform",
  provisioning_status: "active",
  data_isolation_level: "shared",
  cerbos_scope_key: "org/test",
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  metadata: null,
  branch_code: null,
  branch_type: null,
  address_line1: null,
  city: null,
  state: null,
  pin_code: null,
  contact_phone: null,
  contact_email: null,
  tenant_numeric_code: null,
  free_follow_up_days: 15,
  free_follow_up_visits: 1,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
};

const createdModule: TenantModule = {
  iq_tenant_id: TENANT_ID,
  module_id: MODULE_ID,
  is_active: true,
  is_core_override: false,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
};

function makeProfilesRepo(): TenantIntegrationProfilesRepo {
  return {
    findAll: async () => [storedProfile],
    findById: async () => storedProfile,
    findActiveByTenantId: async () => storedProfile,
    findActiveByHipId: async () => storedProfile,
    create: async () => storedProfile,
    update: async () => storedProfile,
    delete: async () => true,
  };
}

function makeTenantRepo(): TenantRepo {
  return {
    findAll: async () => [sampleTenant],
    findById: async () => sampleTenant,
    findBySlug: async () => undefined,
    findByOrgId: async () => [sampleTenant],
    findByOrgIdAndBranchCode: async () => undefined,
    create: async () => sampleTenant,
    update: async () => sampleTenant,
  };
}

function makeModuleRepo(): TenantModuleRepo {
  return {
    findAll: async () => [],
    findByKey: async () => undefined,
    create: async () => createdModule,
    update: async () => undefined,
    delete: async () => true,
  };
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(
    async (api) => {
      registerTenantIntegrationProfilesHandler(api, {
        tenantIntegrationProfilesRepo: makeProfilesRepo(),
        tenantRepo: makeTenantRepo(),
      });
      registerTenantModulesHandler(api, {
        tenantModuleRepo: makeModuleRepo(),
        tenantRepo: makeTenantRepo(),
      });
    },
    { prefix: "/api/configurator/v1" },
  );
  await app.ready();
  return app;
}

const PROFILES_BASE = `/api/configurator/v1/tenants/${TENANT_ID}/integration-profiles`;
const PROFILE_URL = `${PROFILES_BASE}/${PROFILE_ID}`;
const MODULES_URL = `/api/configurator/v1/tenants/${TENANT_ID}/modules`;

describe("configurator role gate + secret redaction", () => {
  let app: FastifyInstance;
  const ORIGINAL_INTERNAL_KEY = process.env["CONFIGURATOR_INTERNAL_API_KEY"];

  beforeAll(async () => {
    // Make the internal S2S guard deterministic regardless of ambient env.
    process.env["CONFIGURATOR_INTERNAL_API_KEY"] = INTERNAL_KEY;
    // App is stateless (the repos are fixed fakes), so one instance serves every case.
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    if (ORIGINAL_INTERNAL_KEY === undefined) {
      delete process.env["CONFIGURATOR_INTERNAL_API_KEY"];
    } else {
      process.env["CONFIGURATOR_INTERNAL_API_KEY"] = ORIGINAL_INTERNAL_KEY;
    }
  });

  // --- role gate: non-super-admin is rejected on every management route ----

  const managementRoutes = [
    { method: "GET" as const, url: PROFILES_BASE, label: "list profiles", ok: 200 },
    { method: "GET" as const, url: PROFILE_URL, label: "get profile", ok: 200 },
    {
      method: "POST" as const,
      url: PROFILES_BASE,
      label: "create profile",
      payload: { integration_kind: "abdm", hip_id: "HIP-1", hiu_id: "HIU-1" },
      ok: 201,
    },
    {
      method: "PATCH" as const,
      url: PROFILE_URL,
      label: "update profile",
      payload: { hip_display_name: "x" },
      ok: 200,
    },
    { method: "DELETE" as const, url: PROFILE_URL, label: "delete profile", ok: 204 },
    {
      method: "POST" as const,
      url: MODULES_URL,
      label: "enable module",
      payload: { module_id: MODULE_ID },
      ok: 201,
    },
  ];

  it.each(managementRoutes)(
    "$method $label → 403 for a non-super-admin",
    async ({ method, url, payload }) => {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: clerk },
        ...(payload ? { payload } : {}),
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toMatch(/super-admin/i);
    },
  );

  it.each(managementRoutes)(
    "$method $label → succeeds ($ok) for a super-admin",
    async ({ method, url, payload, ok }) => {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: superAdmin },
        ...(payload ? { payload } : {}),
      });
      expect(res.statusCode).toBe(ok);
    },
  );

  // --- secret redaction on management responses ----------------------------

  it("GET list redacts client_secret but keeps client_id", async () => {
    const res = await app.inject({
      method: "GET",
      url: PROFILES_BASE,
      headers: { authorization: superAdmin },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].client_secret).toBeNull();
    expect(body.data[0].client_id).toBe("abdm-client-id");
    // The raw stored secret must appear nowhere in the serialized response.
    expect(res.body).not.toContain(STORED_SECRET);
  });

  it("GET by id redacts client_secret", async () => {
    const res = await app.inject({
      method: "GET",
      url: PROFILE_URL,
      headers: { authorization: superAdmin },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).client_secret).toBeNull();
    expect(res.body).not.toContain(STORED_SECRET);
  });

  it("POST returns the created profile with client_secret redacted", async () => {
    const res = await app.inject({
      method: "POST",
      url: PROFILES_BASE,
      headers: { authorization: superAdmin },
      payload: {
        integration_kind: "abdm",
        hip_id: "HIP-1",
        hiu_id: "HIU-1",
        client_secret: STORED_SECRET,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).client_secret).toBeNull();
    expect(res.body).not.toContain(STORED_SECRET);
  });

  it("PATCH returns the updated profile with client_secret redacted", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: PROFILE_URL,
      headers: { authorization: superAdmin },
      payload: { hip_display_name: "renamed" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).client_secret).toBeNull();
    expect(res.body).not.toContain(STORED_SECRET);
  });

  // --- internal S2S route STILL exposes the secret (integration-hub needs it) ---

  it("internal by-hip route returns the real client_secret (not redacted)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/configurator/v1/integration-profiles/by-hip/HIP-1",
      headers: { "x-configurator-internal-key": INTERNAL_KEY },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).client_secret).toBe(STORED_SECRET);
  });
});

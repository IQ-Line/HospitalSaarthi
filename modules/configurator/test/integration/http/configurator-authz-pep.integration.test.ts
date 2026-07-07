import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { registerTenantIntegrationProfilesHandler } from "../../../src/rest-handlers/tenant-integration-profiles.handler.js";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../../../src/ports.js";
import type { TenantIntegrationProfile } from "../../../src/domain/tenant-integration-profile.types.js";
import type { Tenant } from "../../../src/domain/tenant.types.js";

// ---------------------------------------------------------------------------
// Module-level guard: secret redaction on management responses is a HANDLER behavior, independent
// of the Cerbos PEP (which is wired at the service layer). The removal of the imperative
// `assertPlatformSuperAdmin` role gate must NOT weaken redaction — the stored ABDM client_secret
// still never travels back over the management surface. The full identity -> enricher -> authz
// round-trip (401/403/200 + onReady probe) lives in the service test
// (services/configurator-svc/test/integration/authz-pep-wiring.integration.test.ts), since only
// the service may compose @hims/user-management + @hims/ts-sdk-authz.
// ---------------------------------------------------------------------------

const TENANT_ID = "94478596-14d1-4e7e-b8d2-2995c61c3c90";
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const STORED_SECRET = "abdm-client-secret-DO-NOT-LEAK";

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

function makeProfilesRepo(): TenantIntegrationProfilesRepo {
  return {
    findAll: async () => [storedProfile],
    findById: async () => storedProfile,
    findActiveByTenantId: async () => storedProfile,
    findActiveByHipId: async () => storedProfile,
    findAllActiveByKind: async () => [storedProfile],
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

function buildApp(): FastifyInstance {
  const app = Fastify();
  app.register(
    async (api) => {
      registerTenantIntegrationProfilesHandler(api, {
        tenantIntegrationProfilesRepo: makeProfilesRepo(),
        tenantRepo: makeTenantRepo(),
      });
    },
    { prefix: "/api/configurator/v1" },
  );
  return app;
}

describe("configurator management responses redact the stored client_secret", () => {
  const apps: FastifyInstance[] = [];
  const PROFILES_BASE = `/api/configurator/v1/tenants/${TENANT_ID}/integration-profiles`;

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  it("GET list redacts client_secret but keeps client_id", async () => {
    const app = buildApp();
    apps.push(app);
    await app.ready();
    const res = await app.inject({ method: "GET", url: PROFILES_BASE });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data[0].client_secret).toBeNull();
    expect(body.data[0].client_id).toBe("abdm-client-id");
    expect(res.body).not.toContain(STORED_SECRET);
  });

  it("GET by id redacts client_secret", async () => {
    const app = buildApp();
    apps.push(app);
    await app.ready();
    const res = await app.inject({ method: "GET", url: `${PROFILES_BASE}/${PROFILE_ID}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).client_secret).toBeNull();
    expect(res.body).not.toContain(STORED_SECRET);
  });

  it("internal S2S by-hip route STILL returns the real client_secret (integration-hub needs it)", async () => {
    const app = buildApp();
    apps.push(app);
    await app.ready();
    const res = await app.inject({
      method: "GET",
      url: "/api/configurator/v1/integration-profiles/by-hip/HIP-1",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).client_secret).toBe(STORED_SECRET);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfiguratorHttpIntegrationProfileRepo } from "./configurator-http-integration-profile-repo.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";
const profileRow = {
  id: "profile-1",
  iq_tenant_id: tenantId,
  integration_kind: "abdm",
  is_active: true,
  hip_id: "IN3610001625",
  hiu_id: "SBX_TEST_HIU_001",
  cm_id: "sbx",
  client_id: "cid",
  client_secret: "csecret",
  gateway_environment: "sandbox",
  sms_config: {},
};

describe("ConfiguratorHttpIntegrationProfileRepo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("findActiveByTenantId uses internal by-tenant route", async () => {
    const fetchMock = vi.fn(async () => Response.json(profileRow));
    vi.stubGlobal("fetch", fetchMock);

    const repo = new ConfiguratorHttpIntegrationProfileRepo({
      baseUrl: "http://localhost:3001",
      internalApiKey: "secret-key",
      fetchImpl: fetchMock,
    });

    const profile = await repo.findActiveByTenantId(tenantId);
    expect(profile?.hipId).toBe("IN3610001625");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/integration-profiles/by-tenant/${tenantId}`),
      expect.objectContaining({
        method: "GET",
        headers: { "x-configurator-internal-key": "secret-key" },
      }),
    );
  });

  it("findActiveByHipId sends internal key when configured", async () => {
    const fetchMock = vi.fn(async () => Response.json(profileRow));
    const repo = new ConfiguratorHttpIntegrationProfileRepo({
      baseUrl: "http://localhost:3001",
      internalApiKey: "secret-key",
      fetchImpl: fetchMock,
    });

    const profile = await repo.findActiveByHipId("IN3610001625");
    expect(profile?.iqTenantId).toBe(tenantId);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/integration-profiles/by-hip/IN3610001625"),
      expect.objectContaining({
        headers: { "x-configurator-internal-key": "secret-key" },
      }),
    );
  });

  it("returns undefined on 404", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    const repo = new ConfiguratorHttpIntegrationProfileRepo({
      baseUrl: "http://localhost:3001",
      fetchImpl: fetchMock,
    });

    await expect(repo.findActiveByHipId("UNKNOWN")).resolves.toBeUndefined();
  });
});

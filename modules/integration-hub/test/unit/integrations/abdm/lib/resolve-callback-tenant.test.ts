import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntegrationProfileRepo } from "../../../../../src/lib/integration-profile-repo.js";
import {
  resolveCallbackTenant,
  resolveCallbackTenantId,
} from "../../../../../src/integrations/abdm/lib/resolve-callback-tenant.js";

const sampleProfile = {
  id: "p1",
  iqTenantId: "00000000-0000-4000-8000-0000000000aa",
  integrationKind: "abdm" as const,
  hipId: "IN3610001625",
  hiuId: "HIU",
  cmId: "sbx",
  clientId: null,
  clientSecret: null,
  defaultSmsPhone: null,
  hipDisplayName: null,
  callbackBaseUrl: null,
  smsProvider: null,
  smsConfig: {},
  gatewayEnvironment: "sandbox" as const,
};

describe("resolveCallbackTenant", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("prefers x-tenant-id header without HIP lookup", async () => {
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
    };
    const resolved = await resolveCallbackTenant(
      { "x-tenant-id": "tenant-from-header" },
      profiles,
    );
    expect(resolved).toEqual({ iqTenantId: "tenant-from-header" });
    expect(profiles.findActiveByHipId).not.toHaveBeenCalled();
  });

  it("resolves tenant and profile from HIP via profile repo", async () => {
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(async (hipId: string) =>
        hipId === "IN3610001625" ? { ...sampleProfile, hipId } : undefined,
      ),
    };

    const resolved = await resolveCallbackTenant({ "X-HIP-ID": "IN3610001625" }, profiles);
    expect(resolved.iqTenantId).toBe("00000000-0000-4000-8000-0000000000aa");
    expect(resolved.profile?.hipId).toBe("IN3610001625");
  });

  it("falls back to ABDM_DEV_TENANT_ID in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env["ABDM_DEV_TENANT_ID"] = "dev-tenant-uuid";
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(async () => undefined),
    };

    const resolved = await resolveCallbackTenant({ "X-HIP-ID": "UNKNOWN" }, profiles);
    expect(resolved).toEqual({ iqTenantId: "dev-tenant-uuid" });
  });

  it("rejects ABDM_DEV_TENANT_ID fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env["ABDM_DEV_TENANT_ID"] = "dev-tenant-uuid";
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(async () => undefined),
    };

    await expect(
      resolveCallbackTenant({ "X-HIP-ID": "UNKNOWN" }, profiles),
    ).rejects.toThrow(/No active integration profile for HIP/);
  });

  it("rejects dev fallback in staging when no HIP or header", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    process.env["ABDM_DEV_TENANT_ID"] = "dev-tenant-uuid";
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
    };

    await expect(resolveCallbackTenant({}, profiles)).rejects.toThrow(
      /x-tenant-id or X-HIP-ID required/,
    );
  });
});

describe("resolveCallbackTenantId", () => {
  it("returns tenant id only", async () => {
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
    };
    const tenant = await resolveCallbackTenantId(
      { "x-tenant-id": "tenant-from-header" },
      profiles,
    );
    expect(tenant).toBe("tenant-from-header");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntegrationProfileRepo } from "../../../lib/integration-profile-repo.js";
import { resolveCallbackTenantId } from "./resolve-callback-tenant.js";

describe("resolveCallbackTenantId", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("prefers x-tenant-id header", async () => {
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
    };
    const tenant = await resolveCallbackTenantId(
      { "x-tenant-id": "tenant-from-header" },
      profiles,
    );
    expect(tenant).toBe("tenant-from-header");
    expect(profiles.findActiveByHipId).not.toHaveBeenCalled();
  });

  it("resolves tenant from HIP via profile repo", async () => {
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(async (hipId: string) =>
        hipId === "IN3610001625"
          ? {
              id: "p1",
              iqTenantId: "00000000-0000-4000-8000-0000000000aa",
              integrationKind: "abdm" as const,
              hipId,
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
            }
          : undefined,
      ),
    };

    const tenant = await resolveCallbackTenantId({ "X-HIP-ID": "IN3610001625" }, profiles);
    expect(tenant).toBe("00000000-0000-4000-8000-0000000000aa");
  });

  it("falls back to ABDM_DEV_TENANT_ID", async () => {
    process.env["ABDM_DEV_TENANT_ID"] = "dev-tenant-uuid";
    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(async () => undefined),
    };

    const tenant = await resolveCallbackTenantId({ "X-HIP-ID": "UNKNOWN" }, profiles);
    expect(tenant).toBe("dev-tenant-uuid");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import { getActiveIntegrationProfileByHipId } from "./get-active-integration-profile-by-hip-id.js";

const sampleProfile = {
  id: "profile-1",
  iq_tenant_id: "00000000-0000-4000-8000-0000000000aa",
  integration_kind: "abdm" as const,
  is_active: true,
  hip_id: "HIP1",
  hiu_id: "HIU1",
  cm_id: "sbx",
  client_id: null,
  client_secret: "secret",
  default_sms_phone: null,
  hip_display_name: null,
  callback_base_url: null,
  sms_provider: null,
  sms_config: {},
  gateway_environment: "sandbox" as const,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: null,
  updated_by: null,
};

describe("getActiveIntegrationProfileByHipId", () => {
  it("returns active profile for hip and kind", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn().mockResolvedValue(sampleProfile),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const profile = await getActiveIntegrationProfileByHipId(repo, "HIP1", "abdm");

    expect(profile.hip_id).toBe("HIP1");
    expect(repo.findActiveByHipId).toHaveBeenCalledWith("HIP1", "abdm");
  });

  it("throws 404 when no active profile", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn().mockResolvedValue(undefined),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(getActiveIntegrationProfileByHipId(repo, "UNKNOWN")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

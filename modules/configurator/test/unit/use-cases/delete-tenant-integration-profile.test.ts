import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../../../src/ports.js";
import { deleteTenantIntegrationProfile } from "../../../src/use-cases/delete-tenant-integration-profile.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

const existingProfile = {
  id: "profile-1",
  iq_tenant_id: tenantId,
  integration_kind: "abdm" as const,
  is_active: true,
  hip_id: "HIP1",
  hiu_id: "HIU1",
  cm_id: "sbx",
  client_id: null,
  client_secret: null,
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

describe("deleteTenantIntegrationProfile", () => {
  it("deletes when profile belongs to tenant", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(existingProfile),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    };

    await deleteTenantIntegrationProfile(repo, "profile-1", tenantId);

    expect(repo.delete).toHaveBeenCalledWith("profile-1");
  });

  it("throws 404 when profile tenant mismatches", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        ...existingProfile,
        iq_tenant_id: "00000000-0000-4000-8000-0000000000bb",
      }),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(
      deleteTenantIntegrationProfile(repo, "profile-1", tenantId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

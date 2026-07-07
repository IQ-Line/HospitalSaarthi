import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../../../src/ports.js";
import { updateTenantIntegrationProfile } from "../../../src/use-cases/update-tenant-integration-profile.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

describe("updateTenantIntegrationProfile", () => {
  it("returns updated profile", async () => {
    const updated = {
      id: "profile-1",
      iq_tenant_id: tenantId,
      integration_kind: "abdm" as const,
      is_active: false,
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
      gateway_environment: "production" as const,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    };

    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(updated),
      delete: vi.fn(),
    };

    const result = await updateTenantIntegrationProfile(repo, "profile-1", tenantId, {
      is_active: false,
      gateway_environment: "production",
    });

    expect(result.is_active).toBe(false);
    expect(repo.update).toHaveBeenCalledWith("profile-1", tenantId, {
      is_active: false,
      gateway_environment: "production",
    });
  });

  it("throws 404 when update returns nothing", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    };

    await expect(
      updateTenantIntegrationProfile(repo, "missing", tenantId, { is_active: true }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

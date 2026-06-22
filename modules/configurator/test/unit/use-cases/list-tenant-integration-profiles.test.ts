import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../../../src/ports.js";
import { listTenantIntegrationProfiles } from "../../../src/use-cases/list-tenant-integration-profiles.js";

describe("listTenantIntegrationProfiles", () => {
  it("delegates filters to repo.findAll", async () => {
    const profiles = [
      {
        id: "profile-1",
        iq_tenant_id: "00000000-0000-4000-8000-0000000000aa",
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
      },
    ];

    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn().mockResolvedValue(profiles),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const result = await listTenantIntegrationProfiles(repo, {
      iq_tenant_id: "00000000-0000-4000-8000-0000000000aa",
      integration_kind: "abdm",
    });

    expect(result).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalledWith({
      iq_tenant_id: "00000000-0000-4000-8000-0000000000aa",
      integration_kind: "abdm",
    });
  });
});

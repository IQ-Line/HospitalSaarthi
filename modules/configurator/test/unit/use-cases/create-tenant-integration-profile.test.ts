import { describe, expect, it, vi } from "vitest";
import { ConfiguratorError } from "../../../src/errors.js";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../../../src/ports.js";
import { createTenantIntegrationProfile } from "../../../src/use-cases/create-tenant-integration-profile.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

function mockRepos(overrides?: {
  tenant?: { iq_tenant_id: string } | undefined;
}) {
  const tenantRepo: TenantRepo = {
    findById: vi.fn().mockResolvedValue(overrides?.tenant),
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    findByOrgId: vi.fn(),
    findByOrgIdAndBranchCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const tenantIntegrationProfilesRepo: TenantIntegrationProfilesRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findActiveByTenantId: vi.fn(),
    findActiveByHipId: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: "profile-1",
      iq_tenant_id: tenantId,
      integration_kind: "abdm",
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
      gateway_environment: "sandbox",
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
      updated_by: null,
    }),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return { tenantRepo, tenantIntegrationProfilesRepo };
}

describe("createTenantIntegrationProfile", () => {
  it("rejects when tenant does not exist", async () => {
    const { tenantRepo, tenantIntegrationProfilesRepo } = mockRepos({
      tenant: undefined,
    });

    await expect(
      createTenantIntegrationProfile(tenantIntegrationProfilesRepo, tenantRepo, {
        iq_tenant_id: tenantId,
        integration_kind: "abdm",
        hip_id: "HIP1",
        hiu_id: "HIU1",
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: "tenant not found" });
  });

  it("creates profile when tenant exists", async () => {
    const { tenantRepo, tenantIntegrationProfilesRepo } = mockRepos({
      tenant: { iq_tenant_id: tenantId },
    });

    const created = await createTenantIntegrationProfile(
      tenantIntegrationProfilesRepo,
      tenantRepo,
      {
        iq_tenant_id: tenantId,
        integration_kind: "abdm",
        hip_id: "HIP1",
        hiu_id: "HIU1",
      },
    );

    expect(created.hip_id).toBe("HIP1");
    expect(tenantIntegrationProfilesRepo.create).toHaveBeenCalledOnce();
  });
});

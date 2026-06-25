import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import { getTenantIntegrationProfileById } from "./get-tenant-integration-profile-by-id.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

const profile = {
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

describe("getTenantIntegrationProfileById", () => {
  it("returns profile when tenant matches", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(profile),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const row = await getTenantIntegrationProfileById(repo, "profile-1", tenantId);
    expect(row.id).toBe("profile-1");
  });

  it("throws 404 when tenant does not match", async () => {
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(profile),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveByKind: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(
      getTenantIntegrationProfileById(repo, "profile-1", "00000000-0000-4000-8000-0000000000bb"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

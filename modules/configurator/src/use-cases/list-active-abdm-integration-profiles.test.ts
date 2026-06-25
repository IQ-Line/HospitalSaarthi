import { describe, expect, it, vi } from "vitest";
import type { TenantIntegrationProfilesRepo } from "../ports.js";
import { listActiveAbdmIntegrationProfiles } from "./list-active-abdm-integration-profiles.js";

describe("listActiveAbdmIntegrationProfiles", () => {
  it("delegates to repo.findAllActiveByKind", async () => {
    const profiles = [{ id: "p1" }];
    const repo: TenantIntegrationProfilesRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveByKind: vi.fn().mockResolvedValue(profiles),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const result = await listActiveAbdmIntegrationProfiles(repo);

    expect(result).toBe(profiles);
    expect(repo.findAllActiveByKind).toHaveBeenCalledWith("abdm");
  });
});

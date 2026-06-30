import { describe, expect, it, vi } from "vitest";
import { getMappedFacilityIds } from "./get-mapped-facility-ids.js";
import type { IntegrationProfileRepo } from "../../../../lib/integration-profile-repo.js";
import type { GatewayClient } from "../../ports.js";
import type { TenantIntegrationProfile } from "../../../../lib/integration-context.js";

function profile(hipId: string): TenantIntegrationProfile {
  return {
    id: `p-${hipId}`,
    iqTenantId: "00000000-0000-4000-8000-0000000000aa",
    integrationKind: "abdm",
    hipId,
    hiuId: hipId,
    cmId: "sbx",
    clientId: null,
    clientSecret: null,
    defaultSmsPhone: null,
    hipDisplayName: null,
    callbackBaseUrl: null,
    smsProvider: null,
    smsConfig: {},
    gatewayEnvironment: "sandbox",
  };
}

describe("getMappedFacilityIds", () => {
  it("returns configured hip ids that are eligible on the NHA bridge", async () => {
    const gateway: GatewayClient = {
      get: vi.fn().mockResolvedValue({
        bridge: { id: "SBX_1" },
        services: [
          { id: "IN-LIVE", types: ["HIP", "HIU"] },
          { id: "IN-NOT-CONFIGURED", types: ["HIP"] },
        ],
      }),
      post: vi.fn(),
      getPublicCertificate: vi.fn(),
      getBearerToken: vi.fn(),
      invalidateBearer: vi.fn(),
      invalidateCertificate: vi.fn(),
      getDiagnosticsSnapshot: vi.fn(),
    };

    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveAbdm: vi.fn().mockResolvedValue([
        profile("IN-LIVE"),
        profile("IN-CONFIGURED-ONLY"),
      ]),
    };

    const result = await getMappedFacilityIds({ gateway, profiles });

    expect(result).toEqual(["IN-LIVE"]);
  });
});

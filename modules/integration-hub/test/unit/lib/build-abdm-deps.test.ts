import { describe, expect, it, vi } from "vitest";
import { buildAbdmDepsForTenant } from "../../../src/lib/build-abdm-deps.js";
import type { IntegrationHubSharedInfra } from "../../../src/lib/build-abdm-deps.js";
import type { IntegrationProfileRepo } from "../../../src/lib/integration-profile-repo.js";
import type { TenantIntegrationProfile } from "../../../src/lib/integration-context.js";

const tenantA = "00000000-0000-4000-8000-0000000000aa";
const tenantB = "00000000-0000-4000-8000-0000000000bb";

function profileFor(tenantId: string, hipId: string): TenantIntegrationProfile {
  return {
    id: `profile-${tenantId}`,
    iqTenantId: tenantId,
    integrationKind: "abdm",
    hipId,
    hiuId: "HIU1",
    cmId: "sbx",
    clientId: `client-${tenantId}`,
    clientSecret: `secret-${tenantId}`,
    defaultSmsPhone: null,
    hipDisplayName: "Test HIP",
    callbackBaseUrl: null,
    smsProvider: "logging",
    smsConfig: {},
    gatewayEnvironment: "sandbox",
  };
}

function mockSharedInfra(profiles: IntegrationProfileRepo): IntegrationHubSharedInfra {
  return {
    profiles,
    deployment: {
      gatewayBaseUrl: "https://dev.abdm.gov.in",
      abhaApiBaseUrl: "https://abhasbx.abdm.gov.in/abha/api",
    },
    sessions: {} as IntegrationHubSharedInfra["sessions"],
    inboundMessages: {} as IntegrationHubSharedInfra["inboundMessages"],
    linkTokens: {} as IntegrationHubSharedInfra["linkTokens"],
    consentArtefacts: {} as IntegrationHubSharedInfra["consentArtefacts"],
    m3ConsentRequests: {} as IntegrationHubSharedInfra["m3ConsentRequests"],
    m3ConsentArtefactsHiu: {} as IntegrationHubSharedInfra["m3ConsentArtefactsHiu"],
    m3DataTransfers: {} as IntegrationHubSharedInfra["m3DataTransfers"],
    empi: {} as IntegrationHubSharedInfra["empi"],
    registration: {} as IntegrationHubSharedInfra["registration"],
    recordFoundation: {} as IntegrationHubSharedInfra["recordFoundation"],
    careContextLinkState: {} as IntegrationHubSharedInfra["careContextLinkState"],
    fidelius: {} as IntegrationHubSharedInfra["fidelius"],
    payloadEncryptor: {} as IntegrationHubSharedInfra["payloadEncryptor"],
    linkOtpStore: {} as IntegrationHubSharedInfra["linkOtpStore"],
  };
}

describe("buildAbdmDepsForTenant", () => {
  it("builds distinct gateway identity per tenant", async () => {
    const repo: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(async (id: string) => {
        if (id === tenantA) return profileFor(tenantA, "HIP-A");
        if (id === tenantB) return profileFor(tenantB, "HIP-B");
        return undefined;
      }),
      findActiveByHipId: vi.fn(),
      findAllActiveAbdm: vi.fn(),
    };

    const shared = mockSharedInfra(repo);
    const ctxA = await buildAbdmDepsForTenant(tenantA, shared);
    const ctxB = await buildAbdmDepsForTenant(tenantB, shared);

    expect(ctxA.deps.xHipId).toBe("HIP-A");
    expect(ctxB.deps.xHipId).toBe("HIP-B");
    expect(ctxA.deps.gateway).not.toBe(ctxB.deps.gateway);
  });

  it("throws when no active profile", async () => {
    const repo: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(async () => undefined),
      findActiveByHipId: vi.fn(),
      findAllActiveAbdm: vi.fn(),
    };

    await expect(buildAbdmDepsForTenant(tenantA, mockSharedInfra(repo))).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

import Fastify from "fastify";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { registerM0DiscoveryRoutes } from "../../../../../../src/integrations/abdm/rest-handlers/m0/bridge-discovery-routes.js";
import type { IntegrationHubSharedInfra } from "../../../../../../src/lib/build-abdm-deps.js";
import * as buildDepsModule from "../../../../../../src/lib/build-abdm-deps.js";
import * as findBridgeModule from "../../../../../../src/integrations/abdm/use-cases/m0/find-bridge-services.js";
import * as mappedIdsModule from "../../../../../../src/integrations/abdm/use-cases/m0/get-mapped-facility-ids.js";

function minimalSharedInfra(): IntegrationHubSharedInfra {
  return {
    profiles: {
      findActiveByTenantId: vi.fn(),
      findActiveByHipId: vi.fn(),
      findAllActiveAbdm: vi.fn(),
    },
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

const DEPLOYMENT_GATEWAY = { deployment: true } as never;

describe("registerM0DiscoveryRoutes", () => {
  beforeEach(() => {
    vi.spyOn(buildDepsModule, "buildDeploymentGatewayClient").mockReturnValue(DEPLOYMENT_GATEWAY);
    // If the tenant-scoped gateway were ever consulted, this spy would record it.
    vi.spyOn(buildDepsModule, "buildAbdmDepsForTenant").mockRejectedValue(
      new Error("buildAbdmDepsForTenant must not be called from bridge discovery"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /m0/bridge-services uses the deployment gateway and returns NHA payload", async () => {
    const findSpy = vi
      .spyOn(findBridgeModule, "findBridgeServices")
      .mockResolvedValue({ bridge: { id: "SBX" }, services: [] });

    const app = Fastify();
    await registerM0DiscoveryRoutes(app, minimalSharedInfra());

    const res = await app.inject({ method: "GET", url: "/m0/bridge-services" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ bridge: { id: "SBX" }, services: [] });
    expect(buildDepsModule.buildDeploymentGatewayClient).toHaveBeenCalledTimes(1);
    expect(buildDepsModule.buildAbdmDepsForTenant).not.toHaveBeenCalled();
    expect(findSpy).toHaveBeenCalledWith({ gateway: DEPLOYMENT_GATEWAY });
    await app.close();
  });

  it("ignores a client-supplied x-tenant-id header (no per-tenant gateway selection)", async () => {
    vi.spyOn(mappedIdsModule, "getMappedFacilityIds").mockResolvedValue(["IN3610001625"]);

    const app = Fastify();
    await registerM0DiscoveryRoutes(app, minimalSharedInfra());

    const res = await app.inject({
      method: "GET",
      url: "/tenant/mapped-facility-ids",
      headers: { "x-tenant-id": "22222222-2222-4222-8222-222222222222" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: ["IN3610001625"] });
    // Header ignored: deployment gateway used, tenant-scoped builder never touched.
    expect(buildDepsModule.buildDeploymentGatewayClient).toHaveBeenCalledTimes(1);
    expect(buildDepsModule.buildAbdmDepsForTenant).not.toHaveBeenCalled();
    await app.close();
  });
});

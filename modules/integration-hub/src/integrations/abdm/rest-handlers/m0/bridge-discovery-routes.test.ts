import Fastify from "fastify";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { registerM0DiscoveryRoutes } from "./bridge-discovery-routes.js";
import type { IntegrationHubSharedInfra } from "../../../../lib/build-abdm-deps.js";
import * as resolveGatewayModule from "../../../../lib/resolve-gateway-for-request.js";
import * as findBridgeModule from "../../use-cases/m0/find-bridge-services.js";
import * as mappedIdsModule from "../../use-cases/m0/get-mapped-facility-ids.js";

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

describe("registerM0DiscoveryRoutes", () => {
  beforeEach(() => {
    vi.spyOn(resolveGatewayModule, "resolveGatewayForRequest").mockResolvedValue({
      get: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /m0/bridge-services returns NHA bridge payload", async () => {
    vi.spyOn(findBridgeModule, "findBridgeServices").mockResolvedValue({
      bridge: { id: "SBX" },
      services: [],
    });

    const app = Fastify();
    await registerM0DiscoveryRoutes(app, minimalSharedInfra());

    const res = await app.inject({ method: "GET", url: "/m0/bridge-services" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ bridge: { id: "SBX" }, services: [] });
    await app.close();
  });

  it("GET /tenant/mapped-facility-ids returns success wrapper", async () => {
    vi.spyOn(mappedIdsModule, "getMappedFacilityIds").mockResolvedValue([
      "IN3610001625",
    ]);

    const app = Fastify();
    await registerM0DiscoveryRoutes(app, minimalSharedInfra());

    const res = await app.inject({ method: "GET", url: "/tenant/mapped-facility-ids" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: ["IN3610001625"] });
    await app.close();
  });
});

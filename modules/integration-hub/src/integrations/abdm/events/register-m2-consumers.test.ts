import { describe, expect, it, vi } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import { registerM2EventConsumers } from "./register-m2-consumers.js";
import type { IntegrationHubSharedInfra } from "../../../lib/build-abdm-deps.js";
import type { IntegrationProfileRepo } from "../../../lib/integration-profile-repo.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

describe("registerM2EventConsumers", () => {
  it("builds per-tenant deps from event.iq_tenant_id", async () => {
    const profile = {
      id: "p1",
      iqTenantId: tenantId,
      integrationKind: "abdm" as const,
      hipId: "HIP-TENANT",
      hiuId: "HIU",
      cmId: "sbx",
      clientId: "c",
      clientSecret: "s",
      defaultSmsPhone: null,
      hipDisplayName: null,
      callbackBaseUrl: null,
      smsProvider: "logging",
      smsConfig: {},
      gatewayEnvironment: "sandbox" as const,
    };

    const profiles: IntegrationProfileRepo = {
      findActiveByTenantId: vi.fn(async () => profile),
      findActiveByHipId: vi.fn(),
    };

    const shared = {
      profiles,
      deployment: {
        gatewayBaseUrl: "https://dev.abdm.gov.in",
        abhaApiBaseUrl: "https://abhasbx.abdm.gov.in/abha/api",
      },
      sessions: { findByFlowAndRequestId: vi.fn(async () => null) },
      inboundMessages: {} as IntegrationHubSharedInfra["inboundMessages"],
      linkTokens: {} as IntegrationHubSharedInfra["linkTokens"],
      consentArtefacts: {} as IntegrationHubSharedInfra["consentArtefacts"],
      m3ConsentRequests: {} as IntegrationHubSharedInfra["m3ConsentRequests"],
      m3ConsentArtefactsHiu: {} as IntegrationHubSharedInfra["m3ConsentArtefactsHiu"],
      m3DataTransfers: {} as IntegrationHubSharedInfra["m3DataTransfers"],
      empi: {
        findAbhaAddressByPatientId: vi.fn(async () => undefined),
      } as IntegrationHubSharedInfra["empi"],
      recordFoundation: {} as IntegrationHubSharedInfra["recordFoundation"],
      fidelius: {} as IntegrationHubSharedInfra["fidelius"],
      payloadEncryptor: {} as IntegrationHubSharedInfra["payloadEncryptor"],
      linkOtpStore: {} as IntegrationHubSharedInfra["linkOtpStore"],
    } as IntegrationHubSharedInfra;

    const handlers = new Map<string, (event: unknown) => Promise<void>>();
    const eventBus: EventBus = {
      connect: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(async (topic: string, handler: (event: unknown) => Promise<void>) => {
        handlers.set(topic, handler);
      }),
    };

    await registerM2EventConsumers(eventBus, shared);

    const handler = handlers.get("record-foundation.care-context.registered");
    expect(handler).toBeDefined();

    await handler!({
      iq_tenant_id: tenantId,
      event_type: "record-foundation.care-context.registered",
      payload: {
        requestId: "req-1",
        abhaAddress: "user@sbx",
        careContexts: [],
      },
    });

    expect(profiles.findActiveByTenantId).toHaveBeenCalledWith(tenantId);
  });
});

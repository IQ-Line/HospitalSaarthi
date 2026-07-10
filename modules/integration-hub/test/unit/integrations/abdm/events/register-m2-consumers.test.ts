import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { EventBus, EventHandler } from "@hims/ts-sdk-events";
import { registerM2EventConsumers } from "../../../../../src/integrations/abdm/events/register-m2-consumers.js";
import type { IntegrationHubSharedInfra } from "../../../../../src/lib/build-abdm-deps.js";
import type { IntegrationProfileRepo } from "../../../../../src/lib/integration-profile-repo.js";
import { fakeSessionsPort } from "../../../../helpers/abdm-fakes.js";

const tenantId = "00000000-0000-4000-8000-0000000000aa";

describe("registerM2EventConsumers", () => {
  const envKeys = [
    "ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT",
    "INTEGRATION_HUB_ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT",
  ] as const;

  beforeEach(() => {
    for (const key of envKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of envKeys) delete process.env[key];
  });

  it("does not subscribe when event orchestration is disabled", async () => {
    const subscribe = vi.fn();
    const eventBus: EventBus = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      publish: vi.fn(),
      subscribe,
    };
    await registerM2EventConsumers(eventBus, {} as IntegrationHubSharedInfra);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("builds per-tenant deps from event.iq_tenant_id when enabled", async () => {
    process.env.ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT = "true";
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
      findAllActiveAbdm: vi.fn(),
    };

    const shared = {
      profiles,
      deployment: {
        gatewayBaseUrl: "https://dev.abdm.gov.in",
        abhaApiBaseUrl: "https://abhasbx.abdm.gov.in/abha/api",
      },
      sessions: fakeSessionsPort({ findByFlowAndRequestId: async () => null }),
      inboundMessages: {} as IntegrationHubSharedInfra["inboundMessages"],
      linkTokens: {} as IntegrationHubSharedInfra["linkTokens"],
      consentArtefacts: {} as IntegrationHubSharedInfra["consentArtefacts"],
      m3ConsentRequests: {} as IntegrationHubSharedInfra["m3ConsentRequests"],
      m3ConsentArtefactsHiu: {} as IntegrationHubSharedInfra["m3ConsentArtefactsHiu"],
      m3DataTransfers: {} as IntegrationHubSharedInfra["m3DataTransfers"],
      empi: {
        findPatientByAbhaAddress: vi.fn(async () => null),
        findPatientByDemographics: vi.fn(async () => null),
        findPatientByAbhaNumber: vi.fn(async () => null),
        findAbhaAddressByPatientId: vi.fn(async () => null),
        findM2PatientProfile: vi.fn(async () => null),
      } satisfies IntegrationHubSharedInfra["empi"],
      registration: {
        findM2PatientProfile: vi.fn(async () => null),
        findPatientIdByAbhaAddress: vi.fn(async () => null),
        findAllPatientIdsByAbhaAddress: vi.fn(async () => []),
      } satisfies IntegrationHubSharedInfra["registration"],
      recordFoundation: {} as IntegrationHubSharedInfra["recordFoundation"],
      careContextLinkState: {} as IntegrationHubSharedInfra["careContextLinkState"],
      fidelius: {} as IntegrationHubSharedInfra["fidelius"],
      payloadEncryptor: {} as IntegrationHubSharedInfra["payloadEncryptor"],
      linkOtpStore: {} as IntegrationHubSharedInfra["linkOtpStore"],
    } as IntegrationHubSharedInfra;

    const handlers = new Map<string, EventHandler>();
    const eventBus: EventBus = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      publish: vi.fn(),
      subscribe: vi.fn(async (topic: string, handler: EventHandler) => {
        handlers.set(topic, handler);
        return { unsubscribe: async () => {} };
      }),
    };

    await registerM2EventConsumers(eventBus, shared);

    const handler = handlers.get("record-foundation.care-context.registered");
    expect(handler).toBeDefined();

    await handler!({
      event_id: "00000000-0000-4000-8000-0000000000e1",
      event_type: "record-foundation.care-context.registered",
      source_module: "record-foundation",
      iq_tenant_id: tenantId,
      occurred_at: new Date().toISOString(),
      correlation_id: "00000000-0000-4000-8000-0000000000c1",
      actor_id: "system",
      event_contract_version: "1.0.0",
      payload: {
        care_context_id: "visit-001",
        patient_id: "patient-001",
        source_record_type: "OPCONSULTATION",
        display: "OP visit",
      },
    });

    expect(profiles.findActiveByTenantId).toHaveBeenCalledWith(tenantId);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { EventBus } from "@hims/ts-sdk-events";
import { registerM2EventConsumers } from "./register-m2-consumers.js";
import type { IntegrationHubSharedInfra } from "../../../lib/build-abdm-deps.js";
import type { IntegrationProfileRepo } from "../../../lib/integration-profile-repo.js";

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
        findM2PatientProfile: vi.fn(async () => null),
      } as IntegrationHubSharedInfra["empi"],
      registration: {
        findM2PatientProfile: vi.fn(async () => null),
      } as IntegrationHubSharedInfra["registration"],
      gateway: {
        post: vi.fn(async () => ({})),
      } as IntegrationHubSharedInfra["gateway"],
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
        care_context_id: "visit-001",
        patient_id: "patient-001",
        source_record_type: "OPCONSULTATION",
        display: "OP visit",
      },
    });

    expect(profiles.findActiveByTenantId).toHaveBeenCalledWith(tenantId);
  });
});

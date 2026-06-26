import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../domain/session.js";
import type { AbdmSessionsPort, ConsentArtefactsPort } from "../../../ports.js";
import { buildMockAbdmDeps } from "../../../test-utils/mock-deps.js";
import { handleConsentNotifyCallback } from "./handle-consent-notify-callback.js";

function mockSessions(linkSession: AbdmSession | null): AbdmSessionsPort {
  const rows: AbdmSession[] = [];
  return {
    async create(input) {
      const s: AbdmSession = {
        iqTenantId: input.iqTenantId,
        sessionId: randomUUID(),
        flowKind: input.flowKind,
        state: "INIT",
        txnId: null,
        requestId: null,
        xToken: null,
        tToken: null,
        context: input.initialContext ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(s);
      return s;
    },
    async findById(input) {
      return (
        rows.find(
          (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
        ) ?? null
      );
    },
    async patch(input) {
      const s = rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      );
      if (!s) throw new Error("not found");
      if (input.state !== undefined) s.state = input.state as AbdmSession["state"];
      if (input.contextMerge) s.context = { ...s.context, ...input.contextMerge };
      return s;
    },
    async findUserLinkByTransactionId() {
      return null;
    },
    async findUserLinkByLinkRefNumber() {
      return null;
    },
    async findHipLinkByRequestId() {
      return null;
    },
    async findByFlowAndRequestId() {
      return null;
    },
    async findLatestLinkedUserLinkByAbhaAddress() {
      return linkSession;
    },
  };
}

function consentDetail(overrides: {
  consentId: string;
  hiTypes?: string[];
  careContexts?: Array<{ patientReference: string; careContextReference: string }>;
}) {
  return {
    schemaVersion: "v1",
    consentId: overrides.consentId,
    createdAt: new Date().toISOString(),
    patient: { id: "patient@sbx" },
    hip: { id: "IN3610001625" },
    purpose: { text: "care", code: "CAREMGT", refUri: "http://example" },
    hiTypes: overrides.hiTypes ?? ["OPConsultation"],
    careContexts: overrides.careContexts ?? [
      {
        patientReference: "52d1f69a-c028-41a0-9741-db961460ef07",
        careContextReference: "visit-cc-1",
      },
    ],
    permission: {
      accessMode: "VIEW",
      dateRange: { from: "2020-01-01", to: "2030-01-01" },
      dataEraseAt: "2035-01-01T00:00:00.000Z",
      frequency: { unit: "HOUR", value: 1, repeats: 0 },
    },
  };
}

describe("handleConsentNotifyCallback", () => {
  it("persists consent using EMPI-resolved patientId and filtered care contexts", async () => {
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "true");
    vi.stubEnv("ABDM_DEV_INBOUND_SIMULATION", "true");

    const empiPatientId = "52d1f69a-c028-41a0-9741-db961460ef07";
    const consentId = randomUUID();
    const upsert = vi.fn().mockResolvedValue(undefined);
    const post = vi.fn().mockResolvedValue({});
    const linkSession: AbdmSession = {
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      sessionId: randomUUID(),
      flowKind: "abdm.m2.user-initiated-link.v1",
      state: "LINKED",
      txnId: randomUUID(),
      requestId: null,
      xToken: null,
      tToken: null,
      context: { patientId: empiPatientId, abhaAddress: "patient@sbx" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deps = buildMockAbdmDeps({
      gateway: { post },
      sessions: mockSessions(linkSession),
      consentArtefacts: { upsert, findById: async () => null } as ConsentArtefactsPort,
      empi: {
        findPatientByAbhaAddress: async () => ({
          patientId: empiPatientId,
          demographics: {},
        }),
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => "patient@sbx",
        findM2PatientProfile: async () => null,
      },
    });

    await handleConsentNotifyCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        notification: {
          status: "GRANTED",
          consentId,
          signature: "stub",
          grantAcknowledgement: true,
          consentDetail: consentDetail({ consentId }),
        },
      },
      deps,
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        consentId,
        patientId: empiPatientId,
        artefactJson: expect.objectContaining({
          consentDetail: expect.objectContaining({
            careContexts: [
              {
                patientReference: empiPatientId,
                careContextReference: "visit-cc-1",
              },
            ],
          }),
        }),
      }),
    );
  });

  it("fails closed when granted consent has unsupported hiTypes", async () => {
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "true");
    vi.stubEnv("ABDM_DEV_INBOUND_SIMULATION", "true");

    const consentId = randomUUID();
    const upsert = vi.fn().mockResolvedValue(undefined);
    const sessions = mockSessions(null);
    const deps = buildMockAbdmDeps({
      sessions,
      consentArtefacts: { upsert, findById: async () => null } as ConsentArtefactsPort,
      empi: {
        findPatientByAbhaAddress: async () => ({
          patientId: "patient-1",
          demographics: {},
        }),
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
        findAbhaAddressByPatientId: async () => null,
        findM2PatientProfile: async () => null,
      },
    });

    await handleConsentNotifyCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        notification: {
          status: "GRANTED",
          consentId,
          signature: "stub",
          grantAcknowledgement: true,
          consentDetail: consentDetail({
            consentId,
            hiTypes: ["WellnessRecord"],
          }),
        },
      },
      deps,
    );

    expect(upsert).not.toHaveBeenCalled();
  });
});

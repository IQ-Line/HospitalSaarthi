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

describe("handleConsentNotifyCallback", () => {
  it("persists consent using careContext patientReference without EMPI ABHA match", async () => {
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "true");
    vi.stubEnv("ABDM_DEV_INBOUND_SIMULATION", "true");

    const patientId = "52d1f69a-c028-41a0-9741-db961460ef07";
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
      context: { patientId, abhaAddress: "patient@sbx" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deps = buildMockAbdmDeps({
      gateway: { post },
      sessions: mockSessions(linkSession),
      consentArtefacts: { upsert, findById: async () => null } as ConsentArtefactsPort,
      empi: {
        findPatientByAbhaAddress: async () => null,
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
          consentDetail: {
            schemaVersion: "v1",
            consentId,
            createdAt: new Date().toISOString(),
            patient: { id: "patient@sbx" },
            hip: { id: deps.xHipId },
            purpose: { text: "care", code: "CAREMGT", refUri: "http://example" },
            hiTypes: ["OPConsultation"],
            careContexts: [
              {
                patientReference: patientId,
                careContextReference: "visit-cc-1",
              },
            ],
            permission: {
              accessMode: "VIEW",
              dateRange: { from: "2020-01-01", to: "2030-01-01" },
              dataEraseAt: "2035-01-01T00:00:00.000Z",
              frequency: { unit: "HOUR", value: 1, repeats: 0 },
            },
          },
        },
      },
      deps,
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        consentId,
        patientId,
      }),
    );
  });
});

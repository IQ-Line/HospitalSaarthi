import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../../src/integrations/abdm/domain/session.js";
import type { AbdmSessionsPort } from "../../../../../../../src/integrations/abdm/ports.js";
import { buildMockAbdmDeps } from "../../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import { handleDiscoverCallback } from "../../../../../../../src/integrations/abdm/use-cases/m2/user-initiated-link/handle-discover-callback.js";
import {
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../../helpers/abdm-fakes.js";

function mockSessions(): AbdmSessionsPort {
  const rows: AbdmSession[] = [];
  return fakeSessionsPort({
    create: async (input) => {
      const s = makeSession({
        iqTenantId: input.iqTenantId,
        sessionId: randomUUID(),
        flowKind: input.flowKind,
        context: input.initialContext ?? {},
      });
      rows.push(s);
      return s;
    },
    findById: async (input) =>
      rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      ) ?? null,
    patch: async (input) => {
      const s = rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      );
      if (!s) throw new Error("not found");
      if (input.state !== undefined) s.state = input.state;
      if (input.txnId !== undefined) s.txnId = input.txnId;
      if (input.contextMerge) s.context = { ...s.context, ...input.contextMerge };
      return s;
    },
    findUserLinkByTransactionId: async (input) =>
      rows.find(
        (r) =>
          r.flowKind === "abdm.m2.user-initiated-link.v1" &&
          r.txnId === input.transactionId,
      ) ?? null,
  });
}

describe("handleDiscoverCallback", () => {
  it("posts on-discover with patient-not-found when EMPI has no match", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: fakeGatewayClient({ post }),
      empi: {
        findPatientByAbhaAddress: async () => null,
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
      },
    });

    await handleDiscoverCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: randomUUID(),
        patient: {
          id: "user@sbx",
          name: "Test User",
          gender: "M",
          yearOfBirth: 1990,
          verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
        },
      },
      deps,
    );

    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as { body: { error?: { code: string } } };
    expect(call.body.error?.code).toBe("ABDM-1010");
  });

  it("matches patient when CM sends object-shaped discover payload (ABDM §5.3.2)", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const findPatientByAbhaAddress = vi.fn().mockResolvedValue({
      patientId: "patient-1",
      demographics: {},
    });
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: fakeGatewayClient({ post }),
      empi: {
        findPatientByAbhaAddress,
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => null,
      },
      recordFoundation: {
        listCareContexts: async () => [
          { id: "cc-1", referenceNumber: "ref-open", display: "Open visit" },
        ],
        listBundles: async () => [],
      },
      careContextLinkState: {
        listLinkedReferences: async () => new Set(),
        markLinked: async () => undefined,
      },
    });

    await handleDiscoverCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: randomUUID(),
        patient: {
          id: "yashiverma200111@sbx",
          verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
          name: "Yashi Verma",
          gender: "F",
          yearOfBirth: 2001,
        },
      },
      deps,
    );

    expect(findPatientByAbhaAddress).toHaveBeenCalledWith(
      expect.objectContaining({ abhaAddress: "yashiverma200111@sbx" }),
    );
    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as {
      body: { patient?: Array<{ careContexts: Array<{ referenceNumber: string }> }> };
    };
    expect(call.body.patient?.[0]?.careContexts).toEqual([
      { referenceNumber: "ref-open", display: "Open visit" },
    ]);
  });

  it("groups unlinked care contexts by hiType (one patient block per type)", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: fakeGatewayClient({ post }),
      empi: {
        findPatientByAbhaAddress: async () => ({
          patientId: "patient-1",
          demographics: {},
        }),
        findPatientByDemographics: async () => null,
      },
      recordFoundation: {
        listCareContexts: async () => [
          {
            id: "cc-1",
            referenceNumber: "visit-1_OPConsultNote",
            display: "OP visit",
            hiType: "OPCONSULTATION",
          },
          {
            id: "cc-2",
            referenceNumber: "visit-1_Prescription",
            display: "Prescription",
            hiType: "PRESCRIPTION",
          },
        ],
        listBundles: async () => [],
      },
      careContextLinkState: {
        listLinkedReferences: async () => new Set(),
        markLinked: async () => undefined,
      },
    });

    await handleDiscoverCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: randomUUID(),
        patient: { id: "user@sbx" },
      },
      deps,
    );

    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as {
      body: {
        patient?: Array<{ hiType: string; count: number; careContexts: unknown[] }>;
      };
    };
    expect(call.body.patient).toHaveLength(2);
    expect(call.body.patient).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hiType: "OPConsultation",
          count: 1,
          careContexts: [{ referenceNumber: "visit-1_OPConsultNote", display: "OP visit" }],
        }),
        expect.objectContaining({
          hiType: "Prescription",
          count: 1,
          careContexts: [{ referenceNumber: "visit-1_Prescription", display: "Prescription" }],
        }),
      ]),
    );
  });

  it("excludes care contexts already linked to the ABHA in discovery", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: fakeGatewayClient({ post }),
      empi: {
        findPatientByAbhaAddress: async () => ({
          patientId: "patient-1",
          demographics: {},
        }),
        findPatientByDemographics: async () => null,
      },
      recordFoundation: {
        listCareContexts: async () => [
          { id: "cc-1", referenceNumber: "ref-linked", display: "Linked visit" },
          { id: "cc-2", referenceNumber: "ref-open", display: "Open visit" },
        ],
        listBundles: async () => [],
      },
      careContextLinkState: {
        listLinkedReferences: async () => new Set(["ref-linked"]),
        markLinked: async () => undefined,
      },
    });

    await handleDiscoverCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: randomUUID(),
        patient: [{ id: "user@sbx" }],
      },
      deps,
    );

    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as {
      body: { patient?: Array<{ careContexts: Array<{ referenceNumber: string }> }> };
    };
    expect(call.body.patient?.[0]?.careContexts).toEqual([
      { referenceNumber: "ref-open", display: "Open visit" },
    ]);
  });

  it("rejects demographics-only match below minimum EMPI score", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: fakeGatewayClient({ post }),
      empi: {
        findPatientByAbhaAddress: async () => null,
        findPatientByAbhaNumber: async () => null,
        findPatientByDemographics: async () => ({
          patientId: "weak-match-patient",
          score: 0.5,
        }),
      },
    });

    await handleDiscoverCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: randomUUID(),
        patient: {
          name: "Test User",
          gender: "M",
          yearOfBirth: 1990,
          verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
        },
      },
      deps,
    );

    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as { body: { error?: { code: string } } };
    expect(call.body.error?.code).toBe("ABDM-1010");
  });
});

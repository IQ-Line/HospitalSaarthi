import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../domain/session.js";
import type { AbdmSessionsPort } from "../../../ports.js";
import { buildMockAbdmDeps } from "../../../test-utils/mock-deps.js";
import { handleDiscoverCallback } from "./handle-discover-callback.js";

function mockSessions(): AbdmSessionsPort {
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
      return rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      ) ?? null;
    },
    async patch(input) {
      const s = rows.find(
        (r) => r.sessionId === input.sessionId && r.iqTenantId === input.iqTenantId,
      );
      if (!s) throw new Error("not found");
      if (input.state !== undefined) s.state = input.state as AbdmSession["state"];
      if (input.txnId !== undefined) s.txnId = input.txnId;
      if (input.contextMerge) s.context = { ...s.context, ...input.contextMerge };
      return s;
    },
    async findUserLinkByTransactionId(input) {
      return (
        rows.find(
          (r) =>
            r.flowKind === "abdm.m2.user-initiated-link.v1" &&
            r.txnId === input.transactionId,
        ) ?? null
      );
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
    async findAddContextsNotifiedByCareContextReference() {
      return null;
    },
  };
}

describe("handleDiscoverCallback", () => {
  it("posts on-discover with patient-not-found when EMPI has no match", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: { post } as never,
      empi: {
        findPatientByAbhaAddress: async () => null,
        findPatientByDemographics: async () => null,
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
    const call = post.mock.calls[0]![0] as { body: { error?: { code: string } } };
    expect(call.body.error?.code).toBe("ABDM-1010");
  });

  it("excludes care contexts already linked to the ABHA in discovery", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: { post } as never,
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
});

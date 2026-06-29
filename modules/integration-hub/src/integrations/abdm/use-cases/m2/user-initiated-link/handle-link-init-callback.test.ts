import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../domain/session.js";
import type { AbdmSessionsPort } from "../../../ports.js";
import { InMemoryLinkOtpStore } from "../../../lib/link-otp-store.js";
import { buildMockAbdmDeps } from "../../../test-utils/mock-deps.js";
import { handleLinkInitCallback } from "./handle-link-init-callback.js";

function mockSessions(): AbdmSessionsPort {
  const rows: AbdmSession[] = [];
  return {
    async create(input) {
      const s: AbdmSession = {
        iqTenantId: input.iqTenantId,
        sessionId: randomUUID(),
        flowKind: input.flowKind,
        state: "ON_DISCOVER_RESPONDED",
        txnId: input.initialContext?.transactionId as string | null,
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
    async findLatestLinkedUserLinkByAbhaAddress() {
      return null;
    },
  };
}

describe("handleLinkInitCallback", () => {
  it("handles PHR init payload without link and posts on-init with MEDIATE OTP", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sendOtp = vi.fn().mockResolvedValue(undefined);
    const sessions = mockSessions();
    const txnId = randomUUID();
    await sessions.create({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      flowKind: "abdm.m2.user-initiated-link.v1",
      initialContext: {
        transactionId: txnId,
        patientId: "52d1f69a-c028-41a0-9741-db961460ef07",
        abhaAddress: "wardhan_00@sbx",
        careContexts: [
          {
            referenceNumber: "f8fa989e-65cb-42ca-964c-b03036a40452_OPConsultNote",
            display: "OP visit",
            hiType: "OPCONSULTATION",
          },
        ],
      },
    });
    const row = await sessions.findUserLinkByTransactionId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      transactionId: txnId,
    });
    if (row) row.txnId = txnId;

    const linkOtpStore = new InMemoryLinkOtpStore();
    const deps = buildMockAbdmDeps({
      sessions,
      gateway: { post } as never,
      sms: { sendOtp },
      linkOtpStore,
      empi: {
        findM2PatientProfile: async () => ({
          abhaAddress: "wardhan_00@sbx",
          patientName: "Ayush Wardhan",
          gender: "M",
          yearOfBirth: 2000,
          phoneNo: "9876543210",
        }),
        findPatientByAbhaAddress: async () => null,
        findPatientByDemographics: async () => null,
        findPatientByAbhaNumber: async () => null,
        findAbhaAddressByPatientId: async () => "wardhan_00@sbx",
      },
    });

    await handleLinkInitCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: txnId,
        abhaAddress: "wardhan_00@sbx",
        patient: [
          {
            referenceNumber: "52d1f69a-c028-41a0-9741-db961460ef07",
            careContexts: [
              { referenceNumber: "f8fa989e-65cb-42ca-964c-b03036a40452_OPConsultNote" },
            ],
            hiType: "OPConsultation",
            count: 1,
          },
        ],
      },
      deps,
    );

    expect(post).toHaveBeenCalledOnce();
    const call = post.mock.calls[0]![0] as {
      path: string;
      body: {
        link: {
          referenceNumber: string;
          authenticationType: string;
          meta: { communicationHint: string };
        };
      };
    };
    expect(call.path).toContain("on-init");
    expect(call.body.link.authenticationType).toBe("MEDIATE");
    expect(call.body.link.meta.communicationHint).toBe("OTP");
    expect(sendOtp).toHaveBeenCalledOnce();

    const after = await sessions.findUserLinkByTransactionId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      transactionId: txnId,
    });
    const linkRef = String(after?.context.linkRefNumber ?? "");
    expect(linkOtpStore.peekOtp("00000000-0000-4000-8000-0000000000aa", linkRef)).toMatch(
      /^\d{6}$/,
    );
    expect(after?.context.careContexts).toEqual([
      {
        referenceNumber: "f8fa989e-65cb-42ca-964c-b03036a40452_OPConsultNote",
        display: "f8fa989e-65cb-42ca-964c-b03036a40452_OPConsultNote",
        hiType: "OPConsultation",
      },
    ]);
  });

  it("drops care contexts not present in discover session", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sendOtp = vi.fn().mockResolvedValue(undefined);
    const sessions = mockSessions();
    const txnId = randomUUID();
    await sessions.create({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      flowKind: "abdm.m2.user-initiated-link.v1",
      initialContext: {
        transactionId: txnId,
        patientId: "52d1f69a-c028-41a0-9741-db961460ef07",
        abhaAddress: "wardhan_00@sbx",
        careContexts: [
          {
            referenceNumber: "known-cc-1",
            display: "Known",
            hiType: "OPCONSULTATION",
          },
        ],
      },
    });
    const row = await sessions.findUserLinkByTransactionId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      transactionId: txnId,
    });
    if (row) row.txnId = txnId;

    const deps = buildMockAbdmDeps({
      sessions,
      gateway: { post } as never,
      sms: { sendOtp },
      linkOtpStore: new InMemoryLinkOtpStore(),
      empi: {
        findM2PatientProfile: async () => null,
        findPatientByAbhaAddress: async () => null,
        findPatientByDemographics: async () => null,
        findPatientByAbhaNumber: async () => null,
        findAbhaAddressByPatientId: async () => null,
      },
    });

    await handleLinkInitCallback(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        inboundRequestId: randomUUID(),
        transactionId: txnId,
        abhaAddress: "wardhan_00@sbx",
        patient: [
          {
            referenceNumber: "52d1f69a-c028-41a0-9741-db961460ef07",
            careContexts: [{ referenceNumber: "injected-cc-1" }],
            hiType: "OPConsultation",
            count: 1,
          },
        ],
      },
      deps,
    );

    const after = await sessions.findUserLinkByTransactionId({
      iqTenantId: "00000000-0000-4000-8000-0000000000aa",
      transactionId: txnId,
    });
    expect(after?.context.careContexts).toEqual([]);
  });
});

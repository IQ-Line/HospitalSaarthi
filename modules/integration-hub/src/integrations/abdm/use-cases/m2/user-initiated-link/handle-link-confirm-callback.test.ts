import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../domain/session.js";
import type { AbdmSessionsPort } from "../../../ports.js";
import { InMemoryLinkOtpStore } from "../../../lib/link-otp-store.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { buildMockAbdmDeps } from "../../../test-utils/mock-deps.js";
import { handleLinkConfirmCallback } from "./handle-link-confirm-callback.js";

function mockSessions(session: AbdmSession): AbdmSessionsPort {
  const rows = [session];
  return {
    async create(input) {
      const s: AbdmSession = {
        iqTenantId: input.iqTenantId,
        sessionId: randomUUID(),
        flowKind: input.flowKind,
        state: "CREATED",
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
    async findUserLinkByLinkRefNumber(input) {
      return (
        rows.find(
          (r) =>
            r.flowKind === "abdm.m2.user-initiated-link.v1" &&
            (r.context as { linkRefNumber?: string }).linkRefNumber ===
              input.linkRefNumber,
        ) ?? null
      );
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

describe("handleLinkConfirmCallback", () => {
  it("groups on-confirm by hiType and publishes each linked care context", async () => {
    const post = vi.fn().mockResolvedValue({});
    const markLinked = vi.fn().mockResolvedValue(undefined);
    const linkRefNumber = "link-ref-1";
    const tenantId = "00000000-0000-4000-8000-0000000000aa";
    const sessionId = randomUUID();
    const otpStore = new InMemoryLinkOtpStore();
    await otpStore.put({
      iqTenantId: tenantId,
      linkRefNumber,
      otp: "123456",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const sessions = mockSessions({
      iqTenantId: tenantId,
      sessionId,
      flowKind: "abdm.m2.user-initiated-link.v1",
      state: "ON_INIT_RESPONDED",
      txnId: randomUUID(),
      requestId: null,
      xToken: null,
      tToken: null,
      context: {
        linkRefNumber,
        patientId: "52d1f69a-c028-41a0-9741-db961460ef07",
        abhaAddress: "patient@sbx",
        careContexts: [
          {
            referenceNumber: "cc-op-1",
            display: "OP visit",
            hiType: "OPCONSULTATION",
          },
          {
            referenceNumber: "cc-rx-1",
            display: "Rx",
            hiType: "PRESCRIPTION",
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const deps = buildMockAbdmDeps({
      gateway: { post },
      sessions,
      linkOtpStore: otpStore,
      careContextLinkState: { listLinkedReferences: async () => new Set(), markLinked },
    });

    const inboundRequestId = randomUUID();
    vi.useFakeTimers();
    const confirmPromise = handleLinkConfirmCallback(
      {
        iqTenantId: tenantId,
        confirmation: { token: "123456", linkRefNumber },
        inboundRequestId,
      },
      deps,
    );
    await vi.advanceTimersByTimeAsync(2000);
    await confirmPromise;

    const onConfirmCall = post.mock.calls.find(
      ([arg]) =>
        arg.path === "/api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm",
    );
    expect(onConfirmCall).toBeDefined();
    const onConfirmBody = onConfirmCall![0].body as {
      patient: Array<{ hiType: string; careContexts: unknown[] }>;
    };
    expect(onConfirmBody.patient).toHaveLength(2);
    expect(onConfirmBody.patient.map((p) => p.hiType).sort()).toEqual([
      "OPConsultation",
      "Prescription",
    ]);

    const notifyCalls = post.mock.calls.filter(
      ([arg]) => arg.path === M2_GATEWAY_PATHS.contextNotify,
    );
    expect(notifyCalls).toHaveLength(2);
    expect(markLinked).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});

import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../../src/integrations/abdm/domain/session.js";
import type { AbdmSessionsPort } from "../../../../../../../src/integrations/abdm/ports.js";
import { buildMockAbdmDeps } from "../../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import { addContextsPublish } from "../../../../../../../src/integrations/abdm/use-cases/m2/add-contexts/publish.js";

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
      if (input.requestId !== undefined) s.requestId = input.requestId;
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
    async findAddContextsNotifiedByCareContextReference() {
      return null;
    },
  };
}

describe("addContextsPublish", () => {
  it("posts context notify with PascalCase hiType", async () => {
    const post = vi.fn().mockResolvedValue({});
    const sessions = mockSessions();
    const deps = buildMockAbdmDeps({ sessions, gateway: { post } as never });

    const result = await addContextsPublish(
      {
        iqTenantId: "tenant-1",
        abhaAddress: "user@sbx",
        patientReference: "patient-1",
        careContextReference: "visit-1",
        hiType: "OPCONSULTATION",
      },
      deps,
    );

    expect(result.requestId).toBeTruthy();
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining("link/context/notify"),
        xHipId: "test-hip",
      }),
    );
    const body = post.mock.calls[0]![0].body as {
      notification: { hiTypes: string[] };
    };
    expect(body.notification.hiTypes).toEqual(["OPConsultation"]);
  });
});

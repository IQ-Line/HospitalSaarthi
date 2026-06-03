import { describe, expect, it } from "vitest";
import { getAbdmSession } from "./get-session.js";

describe("getAbdmSession", () => {
  it("publishes only allowlisted context keys and redacts secrets", async () => {
    const sessionId = "00000000-0000-4000-8000-000000000099";
    const view = await getAbdmSession(
      {
        iqTenantId: "00000000-0000-4000-8000-0000000000aa",
        sessionId,
      },
      {
        sessions: {
          findById: async () => ({
            sessionId,
            iqTenantId: "00000000-0000-4000-8000-0000000000aa",
            flowKind: "abdm.m2.user-initiated-link.v1",
            state: "ON_DISCOVER_RESPONDED",
            txnId: null,
            requestId: "req-1",
            xToken: null,
            tToken: null,
            context: {
              abhaAddress: "user@sbx",
              patientId: "p1",
              careContexts: [{ referenceNumber: "VISIT-1", display: "OP" }],
              loginTransferToken: "must-not-leak",
              gatewayResponse: { raw: true },
              notification: { consentDetail: { hip: { id: "x" } } },
              error: { code: "E1", message: "failed", stack: "hidden" },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        } as never,
      },
    );

    expect(view?.context).toEqual({
      abhaAddress: "user@sbx",
      patientId: "p1",
      careContexts: [{ referenceNumber: "VISIT-1", display: "OP" }],
      error: { code: "E1", message: "failed" },
    });
    expect(view?.context).not.toHaveProperty("loginTransferToken");
    expect(view?.context).not.toHaveProperty("gatewayResponse");
    expect(view?.context).not.toHaveProperty("notification");
  });
});

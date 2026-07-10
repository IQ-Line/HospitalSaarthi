import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../src/integrations/abdm/domain/session.js";
import { abhaAddressSuggestionsRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/abha-address-suggestions-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
} from "../../../../../helpers/abdm-fakes.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

describe("abhaAddressSuggestionsRequest", () => {
  it("GETs suggestion with Transaction_Id header", async () => {
    const stored: AbdmSession = {
      iqTenantId: TENANT,
      sessionId: SID,
      flowKind: "abdm.m1.aadhaar-otp.v1",
      state: "MOBILE_OTP_VERIFIED",
      txnId: "chain-txn",
      requestId: null,
      xToken: "jwt",
      tToken: null,
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) => (input.sessionId === SID ? stored : null),
      patch: async (input) => {
        Object.assign(stored, {
          ...(input.txnId !== undefined ? { txnId: input.txnId } : {}),
          context: { ...stored.context, ...(input.contextMerge ?? {}) },
        });
        return stored;
      },
    });

    const gateway = fakeGatewayClient({
      post: vi.fn(),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
    });

    const deps = baseAdapterDeps({ sessions, gateway });

    vi.mocked(deps.gateway.get).mockResolvedValue({
      txnId: "suggestion-txn",
      abhaAddressList: ["a", "b"],
    });

    const out = await abhaAddressSuggestionsRequest(
      { sessionId: SID, iqTenantId: TENANT },
      deps,
    );

    expect(out.suggestions).toEqual(["a", "b"]);
    expect(out.txnId).toBe("suggestion-txn");
    expect(deps.gateway.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v3/enrollment/enrol/suggestion",
        headers: { Transaction_Id: "chain-txn" },
      }),
    );
  });
});

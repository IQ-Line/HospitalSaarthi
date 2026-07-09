import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  AbdmFlowKind,
  AbdmSession,
  AbdmSessionShape,
} from "../../../../../../src/integrations/abdm/domain/session.js";
import { AbdmUseCaseError } from "../../../../../../src/integrations/abdm/lib/m1-errors.js";
import { abhaAddressCreateRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/abha-address-create-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../helpers/abdm-fakes.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function sessionRow(overrides: Partial<AbdmSessionShape<AbdmFlowKind>> = {}): AbdmSession {
  return makeSession({
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "MOBILE_OTP_VERIFIED",
    txnId: "chain-txn",
    xToken: "jwt",
    ...overrides,
  });
}

describe("abhaAddressCreateRequest", () => {
  it("rejects preferred other than 1", async () => {
    const stored = sessionRow();
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) => (input.sessionId === SID ? stored : null),
      patch: async () => stored,
    });
    const gateway = fakeGatewayClient({
      post: vi.fn(),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
    });
    const deps = baseAdapterDeps({ sessions, gateway });

    await expect(
      abhaAddressCreateRequest(
        { sessionId: SID, abhaAddress: "valid_name", preferred: 0, iqTenantId: TENANT },
        deps,
      ),
    ).rejects.toThrow(AbdmUseCaseError);

    expect(gateway.post).not.toHaveBeenCalled();
  });

  it("POSTs abha-address with preferred 1", async () => {
    const stored = sessionRow();
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) => (input.sessionId === SID ? stored : null),
      patch: async () => stored,
    });
    const gateway = fakeGatewayClient({
      post: vi.fn().mockResolvedValue({
        txnId: "new-txn",
        healthIdNumber: "91-1111-1111-1111",
        preferredAbhaAddress: "valid_name",
      }),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
    });
    const deps = baseAdapterDeps({ sessions, gateway });

    const out = await abhaAddressCreateRequest(
      { sessionId: SID, abhaAddress: "valid_name", iqTenantId: TENANT },
      deps,
    );

    expect(out.txnId).toBe("new-txn");
    expect(gateway.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v3/enrollment/enrol/abha-address",
        body: { txnId: "chain-txn", abhaAddress: "valid_name", preferred: 1 },
      }),
    );
  });
});

import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { abhaAddressCreateRequest } from "./abha-address-create-request.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function sessionRow(overrides: Partial<AbdmSession> = {}): AbdmSession {
  return {
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "OTP_VERIFIED",
    txnId: "chain-txn",
    requestId: null,
    xToken: "jwt",
    tToken: null,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("abhaAddressCreateRequest", () => {
  it("rejects preferred other than 1", async () => {
    const stored = sessionRow();
    const sessions: AbdmSessionsPort = {
      async create() {
        throw new Error("unused");
      },
      async findById(input) {
        return input.sessionId === SID ? stored : null;
      },
      async patch() {
        return stored;
      },
    };
    const gateway: GatewayClient = {
      post: vi.fn(),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
      getDiagnosticsSnapshot: vi.fn(() => ({
        tokenValidUntilMs: null,
        certValidUntilMs: null,
        certCached: false,
      })),
    };
    const deps: AbdmAdapterDeps = {
      sessions,
      gateway,
      secrets: { resolve: vi.fn() },
      fidelius: { encryptForPeer: vi.fn(), decryptFromPeer: vi.fn() },
    };

    await expect(
      abhaAddressCreateRequest(
        { sessionId: SID, abhaAddress: "valid_name", preferred: 0 },
        deps,
        TENANT,
      ),
    ).rejects.toThrow(AbdmUseCaseError);

    expect(gateway.post).not.toHaveBeenCalled();
  });

  it("POSTs abha-address with preferred 1", async () => {
    const stored = sessionRow();
    const sessions: AbdmSessionsPort = {
      async create() {
        throw new Error("unused");
      },
      async findById(input) {
        return input.sessionId === SID ? stored : null;
      },
      async patch() {
        return stored;
      },
    };
    const gateway: GatewayClient = {
      post: vi.fn().mockResolvedValue({
        txnId: "new-txn",
        healthIdNumber: "91-1111-1111-1111",
        preferredAbhaAddress: "valid_name",
      }),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
      getDiagnosticsSnapshot: vi.fn(() => ({
        tokenValidUntilMs: null,
        certValidUntilMs: null,
        certCached: false,
      })),
    };
    const deps: AbdmAdapterDeps = {
      sessions,
      gateway,
      secrets: { resolve: vi.fn() },
      fidelius: { encryptForPeer: vi.fn(), decryptFromPeer: vi.fn() },
    };

    const out = await abhaAddressCreateRequest(
      { sessionId: SID, abhaAddress: "valid_name" },
      deps,
      TENANT,
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

import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../ports.js";
import { enrolAadhaarOtpResendRequest } from "./enrol-aadhaar-otp-resend-request.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

describe("enrolAadhaarOtpResendRequest", () => {
  it("posts request/otp with empty txnId (resend issues a new NHA transaction)", async () => {
    let stored: AbdmSession = {
      iqTenantId: TENANT,
      sessionId: SID,
      flowKind: "abdm.m1.aadhaar-otp.v1",
      state: "AADHAAR_OTP_REQUESTED",
      txnId: "existing-txn",
      requestId: null,
      xToken: null,
      tToken: null,
      context: { aadhaarMasked: "********9012" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const sessions: AbdmSessionsPort = {
      async create() {
        throw new Error("unused");
      },
      async findById(input) {
        return input.sessionId === stored.sessionId ? stored : null;
      },
      async patch(input) {
        stored = {
          ...stored,
          ...(input.txnId !== undefined ? { txnId: input.txnId } : {}),
          context: { ...stored.context, ...(input.contextMerge ?? {}) },
          updatedAt: new Date(),
        };
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
      fidelius: { encryptForPeer: vi.fn(), decryptBundle: vi.fn() },
    };

    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    vi.mocked(deps.gateway.getPublicCertificate).mockResolvedValue({
      publicKey: spki.toString("base64"),
      encryptionAlgorithm: "RSA/ECB/OAEPWithSHA-1AndMGF1Padding",
    });
    vi.mocked(deps.gateway.post).mockResolvedValue({
      txnId: "new-txn",
      message: "OTP resent",
    });

    const out = await enrolAadhaarOtpResendRequest(
      { sessionId: SID, aadhaarNumber: "123456789012", iqTenantId: TENANT },
      deps,
    );

    expect(out.txnId).toBe("new-txn");
    expect(stored.txnId).toBe("new-txn");
    const call = vi.mocked(deps.gateway.post).mock.calls[0][0] as {
      body: { txnId: string; loginHint: string };
    };
    expect(call.body.txnId).toBe("");
    expect(call.body.loginHint).toBe("aadhaar");
  });
});

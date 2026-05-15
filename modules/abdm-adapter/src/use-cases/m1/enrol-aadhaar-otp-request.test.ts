import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../ports.js";
import { enrolAadhaarOtpRequest } from "./enrol-aadhaar-otp-request.js";

function buildDeps(): AbdmAdapterDeps {
  const rows: AbdmSession[] = [];
  const sessions: AbdmSessionsPort = {
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
    async findById() {
      return null;
    },
    async patch(input) {
      const s = rows.find(
        (x) =>
          x.sessionId === input.sessionId && x.iqTenantId === input.iqTenantId,
      );
      if (!s) throw new Error("not found");
      if (input.state !== undefined) s.state = input.state;
      if (input.txnId !== undefined) s.txnId = input.txnId;
      if (input.contextMerge)
        s.context = { ...s.context, ...input.contextMerge };
      s.updatedAt = new Date();
      return s;
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

  return {
    sessions,
    gateway,
    secrets: { resolve: vi.fn() },
    fidelius: {
      encryptForPeer: vi.fn(),
      decryptFromPeer: vi.fn(),
    },
  };
}

describe("enrolAadhaarOtpRequest", () => {
  it("posts encrypted loginId and returns txnId + sessionId", async () => {
    const deps = buildDeps();
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    vi.mocked(deps.gateway.getPublicCertificate).mockResolvedValue({
      publicKey: spki.toString("base64"),
      encryptionAlgorithm: "RSA/ECB/OAEPWithSHA-1AndMGF1Padding",
    });
    vi.mocked(deps.gateway.post).mockResolvedValue({
      txnId: "txn-from-nha",
      message: "OTP sent",
    });

    const out = await enrolAadhaarOtpRequest(
      { aadhaarNumber: "123456789012" },
      deps,
      "00000000-0000-4000-8000-000000000099",
    );

    expect(out.txnId).toBe("txn-from-nha");
    expect(out.message).toBe("OTP sent");
    expect(out.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(deps.gateway.post).toHaveBeenCalledTimes(1);
    const call = vi.mocked(deps.gateway.post).mock.calls[0][0] as {
      path: string;
      body: {
        scope: string[];
        loginHint: string;
        otpSystem: string;
        txnId: string;
        loginId: string;
      };
    };
    expect(call.path).toBe("/v3/enrollment/request/otp");
    expect(call.body.scope).toEqual(["abha-enrol"]);
    expect(call.body.loginHint).toBe("aadhaar");
    expect(call.body.otpSystem).toBe("aadhaar");
    expect(call.body.loginId.length).toBeGreaterThan(32);
  });
});

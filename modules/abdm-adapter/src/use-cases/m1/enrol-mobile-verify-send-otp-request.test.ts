import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../ports.js";
import { AbdmUseCaseError } from "../../lib/m1-errors.js";
import { resetM1OtpRateLimitForTests } from "../../lib/m1-otp-rate-limit.js";
import { enrolMobileVerifySendOtpRequest } from "./enrol-mobile-verify-send-otp-request.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function abhaCreatedSession(overrides: Partial<AbdmSession> = {}): AbdmSession {
  return {
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "ABHA_CREATED",
    txnId: "txn-after-aadhaar",
    requestId: null,
    xToken: "profile.jwt",
    tToken: null,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("enrolMobileVerifySendOtpRequest", () => {
  it("rejects when session is not ABHA_CREATED", async () => {
    resetM1OtpRateLimitForTests();
    const stored = abhaCreatedSession({ state: "AADHAAR_OTP_REQUESTED" });
    const sessions: AbdmSessionsPort = {
      async create() {
        throw new Error("unused");
      },
      async findById() {
        return stored;
      },
      async patch() {
        return stored;
      },
    };
    const deps: AbdmAdapterDeps = {
      sessions,
      gateway: {
        post: vi.fn(),
        get: vi.fn(),
        getPublicCertificate: vi.fn(),
        getDiagnosticsSnapshot: vi.fn(),
      },
      secrets: { resolve: vi.fn() },
      fidelius: { encryptForPeer: vi.fn(), decryptFromPeer: vi.fn() },
    };

    await expect(
      enrolMobileVerifySendOtpRequest(
        { sessionId: SID, mobile: "9876543210", iqTenantId: TENANT },
        deps,
      ),
    ).rejects.toThrow(AbdmUseCaseError);
  });

  it("dispatches mobile OTP and sets MOBILE_OTP_REQUESTED", async () => {
    resetM1OtpRateLimitForTests();
    let stored = abhaCreatedSession();
    const sessions: AbdmSessionsPort = {
      async create() {
        throw new Error("unused");
      },
      async findById() {
        return stored;
      },
      async patch(input) {
        stored = {
          ...stored,
          ...(input.state !== undefined ? { state: input.state } : {}),
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
      fidelius: { encryptForPeer: vi.fn(), decryptFromPeer: vi.fn() },
    };

    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    vi.mocked(deps.gateway.getPublicCertificate).mockResolvedValue({
      publicKey: spki.toString("base64"),
      encryptionAlgorithm: "RSA/ECB/OAEPWithSHA-1AndMGF1Padding",
    });
    vi.mocked(deps.gateway.post).mockResolvedValue({
      txnId: "mobile-txn",
      message: "OTP sent",
    });

    const out = await enrolMobileVerifySendOtpRequest(
      { sessionId: SID, mobile: "9876543210", iqTenantId: TENANT },
      deps,
    );

    expect(out.txnId).toBe("mobile-txn");
    expect(stored.state).toBe("MOBILE_OTP_REQUESTED");
    expect(stored.txnId).toBe("mobile-txn");
    expect(stored.context["mobileVerifyMasked"]).toBe("******3210");

    const call = vi.mocked(deps.gateway.post).mock.calls[0][0] as {
      path: string;
      body: { scope: string[]; loginHint: string; otpSystem: string; txnId: string };
    };
    expect(call.path).toBe("/v3/enrollment/request/otp");
    expect(call.body.scope).toEqual(["abha-enrol", "mobile-verify"]);
    expect(call.body.loginHint).toBe("mobile");
    expect(call.body.otpSystem).toBe("abdm");
    expect(call.body.txnId).toBe("txn-after-aadhaar");
  });
});

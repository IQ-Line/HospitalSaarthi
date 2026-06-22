import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../src/integrations/abdm/domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../../../../../src/integrations/abdm/ports.js";
import { AbdmUseCaseError } from "../../../../../../src/integrations/abdm/lib/m1-errors.js";
import { enrolMobileVerifyConfirmOtpRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/enrol-mobile-verify-confirm-otp-request.js";

vi.mock("../../../../../../src/integrations/abdm/lib/abdm-otp-timestamp.js", () => ({
  abdmOtpTimestampIst: () => "2026-01-15 17:30:00",
}));

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function mobileOtpRequestedSession(overrides: Partial<AbdmSession> = {}): AbdmSession {
  return {
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "MOBILE_OTP_REQUESTED",
    txnId: "mobile-txn",
    requestId: null,
    xToken: "profile.jwt",
    tToken: null,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("enrolMobileVerifyConfirmOtpRequest", () => {
  it("rejects when session is not MOBILE_OTP_REQUESTED", async () => {
    const stored = mobileOtpRequestedSession({ state: "ABHA_CREATED" });
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
      fidelius: { encryptForPeer: vi.fn(), decryptBundle: vi.fn() },
    };

    await expect(
      enrolMobileVerifyConfirmOtpRequest(
        { sessionId: SID, otp: "123456", iqTenantId: TENANT },
        deps,
      ),
    ).rejects.toThrow(AbdmUseCaseError);
  });

  it("posts auth/byAbdm with IST timeStamp and sets MOBILE_OTP_VERIFIED", async () => {
    let stored = mobileOtpRequestedSession();
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
      fidelius: { encryptForPeer: vi.fn(), decryptBundle: vi.fn() },
    };

    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    vi.mocked(deps.gateway.getPublicCertificate).mockResolvedValue({
      publicKey: spki.toString("base64"),
      encryptionAlgorithm: "RSA/ECB/OAEPWithSHA-1AndMGF1Padding",
    });
    vi.mocked(deps.gateway.post).mockResolvedValue({
      txnId: "txn-after-mobile",
      authResult: "success",
      message: "Verified",
    });

    const out = await enrolMobileVerifyConfirmOtpRequest(
      { sessionId: SID, otp: "123456", iqTenantId: TENANT },
      deps,
    );

    expect(out.txnId).toBe("txn-after-mobile");
    expect(stored.state).toBe("MOBILE_OTP_VERIFIED");
    expect(stored.txnId).toBe("txn-after-mobile");

    const call = vi.mocked(deps.gateway.post).mock.calls[0][0] as {
      path: string;
      body: {
        authData: {
          otp: { timeStamp: string; txnId: string };
        };
      };
    };
    expect(call.path).toBe("/v3/enrollment/auth/byAbdm");
    expect(call.body.authData.otp.timeStamp).toBe("2026-01-15 17:30:00");
    expect(call.body.authData.otp.txnId).toBe("mobile-txn");
  });
});

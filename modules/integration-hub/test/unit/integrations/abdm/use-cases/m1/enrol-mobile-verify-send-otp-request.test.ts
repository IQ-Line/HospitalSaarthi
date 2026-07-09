import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  assertFlowKind,
  type AbdmFlowKind,
  type AbdmSession,
  type AbdmSessionShape,
} from "../../../../../../src/integrations/abdm/domain/session.js";
import { AbdmUseCaseError } from "../../../../../../src/integrations/abdm/lib/m1-errors.js";
import { resetM1OtpRateLimitForTests } from "../../../../../../src/integrations/abdm/lib/m1-otp-rate-limit.js";
import { enrolMobileVerifySendOtpRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/enrol-mobile-verify-send-otp-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../helpers/abdm-fakes.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function abhaCreatedSession(overrides: Partial<AbdmSessionShape<AbdmFlowKind>> = {}): AbdmSession {
  return makeSession({
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "ABHA_CREATED",
    txnId: "txn-after-aadhaar",
    xToken: "profile.jwt",
    ...overrides,
  });
}

describe("enrolMobileVerifySendOtpRequest", () => {
  it("rejects when session is not ABHA_CREATED", async () => {
    resetM1OtpRateLimitForTests();
    const stored = abhaCreatedSession({ state: "AADHAAR_OTP_REQUESTED" });
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async () => stored,
      patch: async () => stored,
    });
    const deps = baseAdapterDeps({
      sessions,
      gateway: fakeGatewayClient({
        post: vi.fn(),
        get: vi.fn(),
        getPublicCertificate: vi.fn(),
      }),
    });

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
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async () => stored,
      patch: async (input) => {
        stored = makeSession({
          ...stored,
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.txnId !== undefined ? { txnId: input.txnId } : {}),
          context: { ...stored.context, ...(input.contextMerge ?? {}) },
          updatedAt: new Date(),
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
    assertFlowKind(stored, "abdm.m1.aadhaar-otp.v1");
    expect(stored.context["mobileVerifyMasked"]).toBe("******3210");

    const call = vi.mocked(deps.gateway.post).mock.calls[0]![0] as {
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

import { randomUUID, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  assertFlowKind,
  type AbdmFlowKind,
  type AbdmSession,
  type AbdmSessionShape,
} from "../../../../../../src/integrations/abdm/domain/session.js";
import { extractEnrolmentProfileTokens } from "@hims/ts-sdk-abha/protocol/m1";
import { enrolAadhaarVerifyRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/enrol-aadhaar-verify-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../helpers/abdm-fakes.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

function baseSession(overrides: Partial<AbdmSessionShape<AbdmFlowKind>> = {}): AbdmSession {
  return makeSession({
    iqTenantId: TENANT,
    sessionId: SID,
    flowKind: "abdm.m1.aadhaar-otp.v1",
    state: "AADHAAR_OTP_REQUESTED",
    txnId: "txn-from-otp",
    ...overrides,
  });
}

describe("extractEnrolmentProfileTokens", () => {
  it("reads jwtResponse", () => {
    const out = extractEnrolmentProfileTokens({
      jwtResponse: { token: "x.jwt", refreshToken: "r.jwt" },
    });
    expect(out.xToken).toBe("x.jwt");
    expect(out.tToken).toBe("r.jwt");
  });

  it("prefers tokens over jwtResponse when both present", () => {
    const out = extractEnrolmentProfileTokens({
      tokens: { token: "a", refreshToken: "b" },
      jwtResponse: { token: "ignored" },
    });
    expect(out.xToken).toBe("a");
  });
});

describe("enrolAadhaarVerifyRequest", () => {
  it("posts byAadhaar and patches session with tokens + txnId", async () => {
    let stored = baseSession();
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) =>
        input.sessionId === stored.sessionId && input.iqTenantId === stored.iqTenantId
          ? stored
          : null,
      patch: async (input) => {
        stored = makeSession({
          ...stored,
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.txnId !== undefined ? { txnId: input.txnId } : {}),
          ...(input.xToken !== undefined ? { xToken: input.xToken } : {}),
          ...(input.tToken !== undefined ? { tToken: input.tToken } : {}),
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
      txnId: "txn-after-create",
      healthIdNumber: "91-1234-5678-XXXX",
      jwtResponse: { token: "profile.jwt", refreshToken: "refresh.jwt" },
      new: true,
    });

    const out = await enrolAadhaarVerifyRequest(
      { sessionId: SID, otp: "123456", mobile: "9876543210", iqTenantId: TENANT },
      deps,
    );

    expect(out.txnId).toBe("txn-after-create");
    expect(out.healthIdNumber).toBe("91-1234-5678-XXXX");
    expect(out.mobileVerifySkipped).toBe(false);
    expect(stored.state).toBe("ABHA_CREATED");
    expect(stored.xToken).toBe("profile.jwt");
    expect(stored.tToken).toBe("refresh.jwt");
    expect(stored.txnId).toBe("txn-after-create");

    expect(deps.gateway.post).toHaveBeenCalledTimes(1);
    const call = vi.mocked(deps.gateway.post).mock.calls[0]![0] as {
      path: string;
      body: {
        authData: { authMethods: string[]; otp: { txnId: string; mobile: string } };
        consent: { code: string };
      };
    };
    expect(call.path).toBe("/v3/enrollment/enrol/byAadhaar");
    expect(call.body.authData.authMethods).toEqual(["otp"]);
    expect(call.body.authData.otp.txnId).toBe("txn-from-otp");
    expect(call.body.authData.otp.mobile).toBe("9876543210");
    expect(call.body.consent.code).toBe("abha-enrollment");
  });

  it("skips mobile-verify when useAadhaarLinkedMobile is true", async () => {
    let stored = baseSession();
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) =>
        input.sessionId === stored.sessionId && input.iqTenantId === stored.iqTenantId
          ? stored
          : null,
      patch: async (input) => {
        stored = makeSession({
          ...stored,
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.txnId !== undefined ? { txnId: input.txnId } : {}),
          ...(input.xToken !== undefined ? { xToken: input.xToken } : {}),
          ...(input.tToken !== undefined ? { tToken: input.tToken } : {}),
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
      txnId: "txn-after-create",
      healthIdNumber: "91-1234-5678-XXXX",
      jwtResponse: { token: "profile.jwt", refreshToken: "refresh.jwt" },
      ABHAProfile: { mobile: "9876543210" },
      new: true,
    });

    const out = await enrolAadhaarVerifyRequest(
      {
        sessionId: SID,
        otp: "123456",
        mobile: "9876543210",
        useAadhaarLinkedMobile: true,
        iqTenantId: TENANT,
      },
      deps,
    );

    expect(out.mobileVerifySkipped).toBe(true);
    expect(stored.state).toBe("MOBILE_OTP_VERIFIED");
    assertFlowKind(stored, "abdm.m1.aadhaar-otp.v1");
    expect(stored.context.mobileVerifiedVia).toBe("aadhaar-linked");
    expect(stored.context.enrolPrimaryMobile).toBe("9876543210");
  });

  it("infers mobile-verify skip from NHA ABHAProfile.mobile when flag omitted", async () => {
    let stored = baseSession();
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async (input) =>
        input.sessionId === stored.sessionId && input.iqTenantId === stored.iqTenantId
          ? stored
          : null,
      patch: async (input) => {
        stored = makeSession({
          ...stored,
          ...(input.state !== undefined ? { state: input.state } : {}),
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
      txnId: "txn-after-create",
      ABHAProfile: { mobile: "9876543210" },
      jwtResponse: { token: "profile.jwt" },
    });

    const out = await enrolAadhaarVerifyRequest(
      { sessionId: SID, otp: "123456", mobile: "9876543210", iqTenantId: TENANT },
      deps,
    );

    expect(out.mobileVerifySkipped).toBe(true);
    expect(stored.state).toBe("MOBILE_OTP_VERIFIED");
  });
});

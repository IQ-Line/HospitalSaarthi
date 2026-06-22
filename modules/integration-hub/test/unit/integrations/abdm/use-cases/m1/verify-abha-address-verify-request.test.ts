import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../src/integrations/abdm/domain/session.js";
import type { AbdmAdapterDeps } from "../../../../../../src/integrations/abdm/ports.js";
import { verifyAbhaAddressVerifyRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/verify-abha-address-verify-request.js";

vi.mock("../../../../../../src/integrations/abdm/lib/rsa-abdm-login-id.js", () => ({
  encryptLoginIdWithAbdmPublicKey: vi.fn(() => "enc-otp"),
}));

const TENANT = "tenant-1";

function session(overrides: Partial<AbdmSession> = {}): AbdmSession {
  return {
    iqTenantId: TENANT,
    sessionId: "sess-phr",
    flowKind: "abdm.m1.verify-existing.v1",
    state: "OTP_REQUESTED",
    txnId: "txn-phr",
    requestId: null,
    xToken: null,
    tToken: null,
    context: {
      loginScopes: ["abha-address-login", "mobile-verify"],
      loginApiVariant: "phr-abha",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("verifyAbhaAddressVerifyRequest", () => {
  it("uses PHR verify path and stores tokens from tokens.token (not verify/user)", async () => {
    let stored = session();
    const patch = vi.fn(async (input: { xToken?: string; state?: string }) => {
      stored = { ...stored, ...input, state: input.state ?? stored.state };
      return stored;
    });
    const post = vi.fn(async () => ({
      message: "OTP verified successfully",
      authResult: "success",
      tokens: { token: "profile.jwt", refreshToken: "refresh.jwt" },
      users: [{ abhaAddress: "user@sbx", abhaNumber: "91-1234-5678-1234" }],
    }));
    const deps: AbdmAdapterDeps = {
      sessions: {
        findById: vi.fn(async () => session()),
        patch,
        create: vi.fn(),
      },
      gateway: {
        getPublicCertificate: vi.fn(async () => ({
          publicKey: "pk",
          encryptionAlgorithm: "RSA",
        })),
        post,
        get: vi.fn(),
        getDiagnosticsSnapshot: vi.fn(() => ({
          tokenValidUntilMs: null,
          certValidUntilMs: null,
          certCached: false,
        })),
      },
      fidelius: {} as AbdmAdapterDeps["fidelius"],
      secrets: {} as AbdmAdapterDeps["secrets"],
    };

    const out = await verifyAbhaAddressVerifyRequest(
      { sessionId: "sess-phr", otp: "123456", iqTenantId: TENANT },
      deps,
    );

    expect(out.needsUserSelection).toBe(false);
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/v3/phr/web/login/abha/verify" }),
    );
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        xToken: "profile.jwt",
        tToken: "refresh.jwt",
        state: "OTP_VERIFIED",
      }),
    );
    expect(stored.xToken).toBe("profile.jwt");
  });
});

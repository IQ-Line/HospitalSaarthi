import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/rsa-abdm-login-id.js", () => ({
  encryptLoginIdWithAbdmPublicKey: vi.fn(() => "enc-otp"),
}));
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps } from "../../ports.js";
import { loginVerifyOtpRequest } from "./login-verify-otp-request.js";

const TENANT = "tenant-1";

function session(overrides: Partial<AbdmSession> = {}): AbdmSession {
  return {
    iqTenantId: TENANT,
    sessionId: "sess-1",
    flowKind: "abdm.m1.login.v1",
    state: "OTP_REQUESTED",
    txnId: "txn-otp",
    requestId: null,
    xToken: null,
    tToken: null,
    context: { loginScopes: ["abha-login", "mobile-verify"] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("loginVerifyOtpRequest", () => {
  it("stores transfer token and accounts when NHA returns account list", async () => {
    const patch = vi.fn(async (input: { contextMerge?: Record<string, unknown> }) => ({
      ...session({ state: "OTP_VERIFIED" }),
      ...input,
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
        post: vi.fn(async () => ({
          txnId: "txn-new",
          message: "OTP verified",
          token: "transfer.jwt",
          accounts: [
            {
              ABHANumber: "91-7561-4088-1234",
              preferredAbhaAddress: "user@sbx",
              name: "Test User",
            },
          ],
        })),
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

    const out = await loginVerifyOtpRequest(
      { sessionId: "sess-1", otp: "123456", iqTenantId: TENANT },
      deps,
    );

    expect(out.needsUserSelection).toBe(true);
    expect(out.accounts).toHaveLength(1);
    expect(out.accounts?.[0]?.abhaNumber).toBe("91-7561-4088-1234");
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        contextMerge: expect.objectContaining({
          loginTransferToken: "transfer.jwt",
          loginNeedsUserVerify: true,
        }),
      }),
    );
    expect(patch.mock.calls[0]?.[0]).not.toHaveProperty("xToken");
  });

  it("stores transfer token and needsUserSelection for aadhaar-verify when NHA returns accounts", async () => {
    const patch = vi.fn(async (input: { contextMerge?: Record<string, unknown> }) => ({
      ...session({ state: "OTP_VERIFIED", context: { loginScopes: ["abha-login", "aadhaar-verify"] } }),
      ...input,
    }));
    const deps: AbdmAdapterDeps = {
      sessions: {
        findById: vi.fn(async () =>
          session({ context: { loginScopes: ["abha-login", "aadhaar-verify"] } }),
        ),
        patch,
        create: vi.fn(),
      },
      gateway: {
        getPublicCertificate: vi.fn(async () => ({
          publicKey: "pk",
          encryptionAlgorithm: "RSA",
        })),
        post: vi.fn(async () => ({
          txnId: "txn-new",
          message: "OTP verified",
          token: "profile.jwt",
          refreshToken: "refresh.jwt",
          accounts: [
            {
              ABHANumber: "91-3488-3776-0621",
              preferredAbhaAddress: "kamal_kamal060600@sbx",
              name: "Kamal Jeet Arya",
            },
          ],
        })),
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

    const out = await loginVerifyOtpRequest(
      { sessionId: "sess-1", otp: "123456", iqTenantId: TENANT },
      deps,
    );

    expect(out.needsUserSelection).toBe(true);
    expect(out.accounts).toHaveLength(1);
    expect(out.loginTransferToken).toBe("profile.jwt");
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        contextMerge: expect.objectContaining({
          loginTransferToken: "profile.jwt",
          loginPendingRefreshToken: "refresh.jwt",
          loginNeedsUserVerify: true,
        }),
      }),
    );
    expect(patch.mock.calls[0]?.[0]).not.toHaveProperty("xToken");
  });

  it("stores refreshToken as transfer token when token is absent", async () => {
    const patch = vi.fn(async () => session({ state: "OTP_VERIFIED" }));
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
        post: vi.fn(async () => ({
          txnId: "txn-new",
          refreshToken: "transfer-from-refresh",
          accounts: [{ ABHANumber: "91-7561-4088-1234" }],
        })),
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

    const out = await loginVerifyOtpRequest(
      { sessionId: "sess-1", otp: "123456", iqTenantId: TENANT },
      deps,
    );

    expect(out.loginTransferToken).toBe("transfer-from-refresh");
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        contextMerge: expect.objectContaining({
          loginTransferToken: "transfer-from-refresh",
        }),
      }),
    );
  });
});

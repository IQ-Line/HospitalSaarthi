import { describe, expect, it, vi } from "vitest";
import type { AbdmAdapterDeps } from "../../../../../../src/integrations/abdm/ports.js";
import { verifyAbhaAddressOtpRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/verify-abha-address-otp-request.js";

vi.mock("../../../../../../src/integrations/abdm/lib/rsa-abdm-login-id.js", () => ({
  encryptLoginIdWithAbdmPublicKey: vi.fn(() => "enc-abha-address"),
}));

const TENANT = "tenant-1";

describe("verifyAbhaAddressOtpRequest", () => {
  it("calls PHR web login OTP path (not profile/login)", async () => {
    const post = vi.fn(async () => ({ txnId: "txn-phr", message: "OTP sent" }));
    const deps: AbdmAdapterDeps = {
      sessions: {
        create: vi.fn(async () => ({
          iqTenantId: TENANT,
          sessionId: "sess-phr",
          flowKind: "abdm.m1.verify-existing.v1",
          state: "INIT",
          txnId: null,
          requestId: null,
          xToken: null,
          tToken: null,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        patch: vi.fn(async () => ({
          iqTenantId: TENANT,
          sessionId: "sess-phr",
          flowKind: "abdm.m1.verify-existing.v1",
          state: "OTP_REQUESTED",
          txnId: "txn-phr",
          requestId: null,
          xToken: null,
          tToken: null,
          context: { loginApiVariant: "phr-abha" },
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findById: vi.fn(),
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

    await verifyAbhaAddressOtpRequest(
      { abhaAddress: "user@sbx", channel: "mobile", iqTenantId: TENANT },
      deps,
    );

    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v3/phr/web/login/abha/request/otp",
        body: expect.objectContaining({
          loginHint: "abha-address",
          scope: ["abha-address-login", "mobile-verify"],
        }),
      }),
    );
  });
});

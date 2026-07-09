import { describe, expect, it, vi } from "vitest";
import { verifyAbhaAddressOtpRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/verify-abha-address-otp-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../helpers/abdm-fakes.js";

vi.mock("../../../../../../src/integrations/abdm/lib/rsa-abdm-login-id.js", () => ({
  encryptLoginIdWithAbdmPublicKey: vi.fn(() => "enc-abha-address"),
}));

const TENANT = "tenant-1";

describe("verifyAbhaAddressOtpRequest", () => {
  it("calls PHR web login OTP path (not profile/login)", async () => {
    const post = vi.fn();
    post.mockResolvedValue({ txnId: "txn-phr", message: "OTP sent" });
    const deps = baseAdapterDeps({
      sessions: fakeSessionsPort({
        create: vi.fn(async () =>
          makeSession({
            iqTenantId: TENANT,
            sessionId: "sess-phr",
            flowKind: "abdm.m1.verify-existing.v1",
            state: "INIT",
          }),
        ),
        patch: vi.fn(async () =>
          makeSession({
            iqTenantId: TENANT,
            sessionId: "sess-phr",
            flowKind: "abdm.m1.verify-existing.v1",
            state: "OTP_REQUESTED",
            txnId: "txn-phr",
            context: { loginApiVariant: "phr-abha" },
          }),
        ),
        findById: vi.fn(),
      }),
      gateway: fakeGatewayClient({
        getPublicCertificate: vi.fn(async () => ({
          publicKey: "pk",
          encryptionAlgorithm: "RSA",
        })),
        post,
        get: vi.fn(),
      }),
    });

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

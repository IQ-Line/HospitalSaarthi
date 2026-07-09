import { describe, expect, it, vi } from "vitest";
import type {
  AbdmFlowKind,
  AbdmSession,
  AbdmSessionShape,
} from "../../../../../../src/integrations/abdm/domain/session.js";
import { loginVerifyUserRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/login-verify-user-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../helpers/abdm-fakes.js";

const TENANT = "tenant-1";

function session(overrides: Partial<AbdmSessionShape<AbdmFlowKind>> = {}): AbdmSession {
  return makeSession({
    iqTenantId: TENANT,
    sessionId: "sess-1",
    flowKind: "abdm.m1.login.v1",
    state: "OTP_VERIFIED",
    txnId: "txn-1",
    context: {
      loginScopes: ["abha-login", "mobile-verify"],
      loginTransferToken: "transfer.jwt",
      loginNeedsUserVerify: true,
    },
    ...overrides,
  });
}

describe("loginVerifyUserRequest", () => {
  it("calls NHA verify/user with T-token and stores profile x_token", async () => {
    const patch = vi.fn(async () => session({ xToken: "profile.jwt" }));
    const post = vi.fn();
    post.mockResolvedValue({
      token: "profile.jwt",
      refreshToken: "refresh.jwt",
      message: "User verified",
    });
    const deps = baseAdapterDeps({
      sessions: fakeSessionsPort({
        findById: vi.fn(async () => session()),
        patch,
        create: vi.fn(),
      }),
      gateway: fakeGatewayClient({ post, get: vi.fn(), getPublicCertificate: vi.fn() }),
    });

    const out = await loginVerifyUserRequest(
      {
        sessionId: "sess-1",
        abhaNumber: "91-7561-4088-1234",
        iqTenantId: TENANT,
      },
      deps,
    );

    expect(out.message).toBe("User verified");
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v3/profile/login/verify/user",
        headers: { "T-token": "Bearer transfer.jwt" },
        body: {
          ABHANumber: "91-7561-4088-1234",
          txnId: "txn-1",
        },
      }),
    );
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        xToken: "profile.jwt",
        tToken: "refresh.jwt",
      }),
    );
  });

  it("completes aadhaar-verify verify/user locally without NHA T-token call", async () => {
    const patch = vi.fn(async () => session({ xToken: "profile.jwt" }));
    const post = vi.fn();
    const deps = baseAdapterDeps({
      sessions: fakeSessionsPort({
        findById: vi.fn(async () =>
          session({
            context: {
              loginScopes: ["abha-login", "aadhaar-verify"],
              loginTransferToken: "profile.jwt",
              loginPendingRefreshToken: "refresh.jwt",
              loginNeedsUserVerify: true,
              loginAccounts: [{ abhaNumber: "91-3488-3776-0621" }],
            },
          }),
        ),
        patch,
        create: vi.fn(),
      }),
      gateway: fakeGatewayClient({ post, get: vi.fn(), getPublicCertificate: vi.fn() }),
    });

    const out = await loginVerifyUserRequest(
      {
        sessionId: "sess-1",
        abhaNumber: "91348837760621",
        iqTenantId: TENANT,
      },
      deps,
    );

    expect(out.message).toBe("User verified");
    expect(post).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        xToken: "profile.jwt",
        tToken: "refresh.jwt",
        contextMerge: expect.objectContaining({
          loginNeedsUserVerify: false,
          loginSelectedAbhaNumber: "91-3488-3776-0621",
        }),
      }),
    );
  });

  it("rejects ABHA-address (PHR) sessions — verify/user is profile/mobile only", async () => {
    const deps = baseAdapterDeps({
      sessions: fakeSessionsPort({
        findById: vi.fn(async () =>
          session({
            flowKind: "abdm.m1.verify-existing.v1",
            context: {
              loginTransferToken: "transfer.jwt",
              loginNeedsUserVerify: true,
              loginApiVariant: "phr-abha",
            },
          }),
        ),
        patch: vi.fn(),
        create: vi.fn(),
      }),
      gateway: fakeGatewayClient({ post: vi.fn(), get: vi.fn(), getPublicCertificate: vi.fn() }),
    });

    await expect(
      loginVerifyUserRequest(
        { sessionId: "sess-1", abhaNumber: "91-7561-4088-1234", iqTenantId: TENANT },
        deps,
        "abdm.m1.verify-existing.v1",
      ),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});

import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../domain/session.js";
import type { AbdmAdapterDeps, AbdmSessionsPort, GatewayClient } from "../../ports.js";
import { profileAccountGetRequest } from "./profile-account-get-request.js";

const TENANT = "00000000-0000-4000-8000-000000000099";
const SID = randomUUID();

describe("profileAccountGetRequest", () => {
  it("calls profile/account with X-token header", async () => {
    const stored: AbdmSession = {
      iqTenantId: TENANT,
      sessionId: SID,
      flowKind: "abdm.m1.aadhaar-otp.v1",
      state: "ABHA_CREATED",
      txnId: "t",
      requestId: null,
      xToken: "raw-jwt",
      tToken: null,
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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

    vi.mocked(deps.gateway.get).mockResolvedValue({ ABHANumber: "x" });

    const out = await profileAccountGetRequest(
      { sessionId: SID, iqTenantId: TENANT },
      deps,
    );

    expect(out.profile).toEqual({ ABHANumber: "x" });
    expect(deps.gateway.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v3/profile/account",
        headers: { "X-token": "Bearer raw-jwt" },
      }),
    );
  });
});

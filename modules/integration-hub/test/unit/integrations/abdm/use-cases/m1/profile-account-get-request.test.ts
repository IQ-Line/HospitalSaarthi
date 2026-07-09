import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AbdmSession } from "../../../../../../src/integrations/abdm/domain/session.js";
import { profileAccountGetRequest } from "../../../../../../src/integrations/abdm/use-cases/m1/profile-account-get-request.js";
import {
  baseAdapterDeps,
  fakeGatewayClient,
  fakeSessionsPort,
} from "../../../../../helpers/abdm-fakes.js";

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
    const sessions = fakeSessionsPort({
      create: async () => {
        throw new Error("unused");
      },
      findById: async () => stored,
      patch: async () => stored,
    });

    const gateway = fakeGatewayClient({
      post: vi.fn(),
      get: vi.fn(),
      getPublicCertificate: vi.fn(),
    });

    const deps = baseAdapterDeps({ sessions, gateway });

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

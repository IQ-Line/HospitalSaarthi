import { describe, expect, it, vi } from "vitest";
import { linkTokenAcquire } from "../../../../../../../src/integrations/abdm/use-cases/m2/link-token/acquire.js";
import { buildMockAbdmDeps } from "../../../../../../../src/integrations/abdm/test-utils/mock-deps.js";
import {
  fakeGatewayClient,
  fakeSessionsPort,
  makeSession,
} from "../../../../../../helpers/abdm-fakes.js";

describe("linkTokenAcquire", () => {
  it("returns 202 TOKEN_REQUESTED immediately when wait is false", async () => {
    const deps = buildMockAbdmDeps({
      sessions: fakeSessionsPort({
        create: async () =>
          makeSession({
            sessionId: "sess-1",
            iqTenantId: "t1",
            flowKind: "abdm.m2.hip-initiated-link.v1",
            state: "INIT",
          }),
        patch: async (input) =>
          makeSession({
            sessionId: input.sessionId,
            iqTenantId: input.iqTenantId,
            flowKind: "abdm.m2.hip-initiated-link.v1",
            state: input.state ?? "TOKEN_REQUESTED",
            context: input.contextMerge ?? {},
          }),
        findById: async () => null,
      }),
      linkTokens: {
        findFresh: async () => null,
        claimAcquisition: async () => "claimed",
        completeAcquisition: async () => undefined,
        invalidate: async () => undefined,
        findAbhaAddressByPendingRequestId: async () => null,
        janitor: async () => 0,
      },
      gateway: fakeGatewayClient({ post: vi.fn().mockResolvedValue({}) }),
    });

    const result = await linkTokenAcquire(
      {
        iqTenantId: "t1",
        abhaAddress: "user@sbx",
        demographics: { name: "Test", gender: "M", yearOfBirth: 1990 },
        wait: false,
      },
      deps,
    );

    expect(result.state).toBe("TOKEN_REQUESTED");
    expect(result.tokenReady).toBe(false);
    expect(result.sessionId).toBe("sess-1");
  });
});

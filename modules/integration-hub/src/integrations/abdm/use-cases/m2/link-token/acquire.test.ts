import { describe, expect, it, vi } from "vitest";
import { linkTokenAcquire } from "./acquire.js";
import { buildMockAbdmDeps } from "../../../test-utils/mock-deps.js";

describe("linkTokenAcquire", () => {
  it("returns 202 TOKEN_REQUESTED immediately when wait is false", async () => {
    const deps = buildMockAbdmDeps({
      sessions: {
        create: async () => ({
          sessionId: "sess-1",
          iqTenantId: "t1",
          flowKind: "abdm.m2.hip-initiated-link.v1",
          state: "INIT",
          txnId: null,
          requestId: null,
          xToken: null,
          tToken: null,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        patch: async (input) => ({
          sessionId: input.sessionId,
          iqTenantId: input.iqTenantId,
          flowKind: "abdm.m2.hip-initiated-link.v1",
          state: input.state ?? "TOKEN_REQUESTED",
          txnId: null,
          requestId: null,
          xToken: null,
          tToken: null,
          context: input.contextMerge ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findById: async () => null,
      } as never,
      linkTokens: {
        findFresh: async () => null,
        claimAcquisition: async () => "claimed" as const,
        completeAcquisition: async () => undefined,
        invalidate: async () => undefined,
      } as never,
      gateway: { post: vi.fn().mockResolvedValue({}) } as never,
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

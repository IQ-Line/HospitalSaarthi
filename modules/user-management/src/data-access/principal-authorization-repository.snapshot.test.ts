import { describe, expect, it } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalAuthorizationRepository } from "./principal-authorization-repository.js";

describe("DrizzlePrincipalAuthorizationRepository (snapshot-only)", () => {
  it("listEffectiveCapabilityKeys reads user_capabilities only, not live role_capabilities", async () => {
    let selectCallCount = 0;
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: async () => [{ capability_key: "um:user:read" }],
    };

    const db = {
      select: () => {
        selectCallCount += 1;
        return chain;
      },
    } as unknown as DbInstance;

    const repo = new DrizzlePrincipalAuthorizationRepository(db);
    await expect(repo.listEffectiveCapabilityKeys("tenant-a", "user-1")).resolves.toEqual([
      "um:user:read",
    ]);
    expect(selectCallCount).toBe(1);
  });
});

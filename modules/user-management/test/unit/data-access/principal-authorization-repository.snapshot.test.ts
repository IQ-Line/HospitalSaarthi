import { describe, expect, it } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzlePrincipalAuthorizationRepository } from "../../../src/data-access/principal-authorization-repository.js";

describe("DrizzlePrincipalAuthorizationRepository (snapshot-only)", () => {
  it("listEffectiveCapabilityKeys reads user_capabilities only, not live role_capabilities", async () => {
    let selectCallCount = 0;
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: async () => [{ capability_key: "users:users:read" }],
    };

    const db = {
      select: () => {
        selectCallCount += 1;
        return chain;
      },
    } as unknown as DbInstance;

    const repo = new DrizzlePrincipalAuthorizationRepository(db);
    await expect(repo.listEffectiveCapabilityKeys("tenant-a", "user-1")).resolves.toEqual([
      "users:users:read",
    ]);
    expect(selectCallCount).toBe(1);
  });
});

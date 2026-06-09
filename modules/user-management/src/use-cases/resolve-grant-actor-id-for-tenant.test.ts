import { describe, expect, it, vi } from "vitest";
import { resolveGrantActorIdForTenant } from "./resolve-grant-actor-id-for-tenant.js";

describe("resolveGrantActorIdForTenant", () => {
  it("returns null when actor has no users row in target tenant", async () => {
    const userRepository = {
      getUserById: vi.fn().mockResolvedValue(null),
    };

    await expect(
      resolveGrantActorIdForTenant(userRepository, "tenant-b", "actor-home-tenant"),
    ).resolves.toBeNull();
  });

  it("returns actor id when present in target tenant", async () => {
    const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const userRepository = {
      getUserById: vi.fn().mockResolvedValue({ id: actorId }),
    };

    await expect(
      resolveGrantActorIdForTenant(userRepository, "tenant-a", actorId),
    ).resolves.toBe(actorId);
  });
});

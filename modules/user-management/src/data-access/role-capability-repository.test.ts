import { describe, expect, it } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzleRoleCapabilityRepository } from "./role-capability-repository.js";

describe("DrizzleRoleCapabilityRepository", () => {
  it("maps flat joined capability rows for listCapabilitiesByRole", async () => {
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: async () => [
        {
          id: "cap-1",
          capability_key: "um:user:read",
          module: "user-management",
          feature: "users",
          action: "read",
          display_name: "Read users",
          description: "Read tenant-scoped platform users.",
          is_active: true,
        },
      ],
    };

    const db = {
      select: () => chain,
    } as unknown as DbInstance;

    const repo = new DrizzleRoleCapabilityRepository(db);

    await expect(repo.listCapabilitiesByRole("tenant-a", "role-a")).resolves.toEqual([
      {
        id: "cap-1",
        capability_key: "um:user:read",
        module: "user-management",
        feature: "users",
        action: "read",
        display_name: "Read users",
        description: "Read tenant-scoped platform users.",
        is_active: true,
      },
    ]);
  });
});

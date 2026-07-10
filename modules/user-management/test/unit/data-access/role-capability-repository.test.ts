import { describe, expect, it } from "vitest";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzleRoleCapabilityRepository } from "../../../src/data-access/role-capability-repository.js";

describe("DrizzleRoleCapabilityRepository", () => {
  it("maps joined capability rows with provenance", async () => {
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: async () => [
        {
          id: "cap-1",
          capability_key: "users:users:read",
          module: "users",
          feature: "users",
          action: "read",
          display_name: "Read users",
          description: "Read tenant-scoped platform users.",
          is_active: true,
          source_module_slug: "users",
          source_permission_slug: "read",
          source_catalog: "master_data",
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
        capability_key: "users:users:read",
        module: "users",
        feature: "users",
        action: "read",
        display_name: "Read users",
        description: "Read tenant-scoped platform users.",
        is_active: true,
        source_module_slug: "users",
        source_permission_slug: "read",
        source_catalog: "master_data",
      },
    ]);
  });
});

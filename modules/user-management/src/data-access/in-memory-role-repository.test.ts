import { describe, expect, it } from "vitest";
import { InvalidRoleSeedError } from "../domain/errors.js";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { InMemoryRoleRepository } from "./in-memory-role-repository.js";

describe("InMemoryRoleRepository", () => {
  it("canonicalizes seeded role codes like the DB constraint", async () => {
    const repo = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: { id: "role-1", code: "  Doctor  ", display_name: "Doctor" },
      },
    ]);
    const role = await repo.getRoleById("tenant-a", "role-1");
    expect(role?.code).toBe(normalizeRoleCode("  Doctor  "));
  });

  it("rejects empty role codes after normalization", () => {
    expect(
      () =>
        new InMemoryRoleRepository([
          {
            tenantId: "tenant-a",
            role: { id: "role-1", code: "   ", display_name: "X" },
          },
        ]),
    ).toThrow(InvalidRoleSeedError);
  });
});

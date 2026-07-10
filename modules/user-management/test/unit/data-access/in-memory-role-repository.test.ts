import { describe, expect, it } from "vitest";
import { InvalidRoleSeedError } from "../../../src/domain/errors.js";
import { normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";

describe("InMemoryRoleRepository", () => {
  it("canonicalizes seeded role codes like the DB constraint", async () => {
    const repo = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: { id: "role-1", code: "  Doctor  ", role_type: "  Doctor  ", display_name: "Doctor", is_system: false, status: "active" },
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
            role: { id: "role-1", code: "   ", role_type: "   ", display_name: "X", is_system: false, status: "active" },
          },
        ]),
    ).toThrow(InvalidRoleSeedError);
  });
});

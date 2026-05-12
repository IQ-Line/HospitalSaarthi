import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DrizzleRoleAssignmentRepository } from "./role-assignment-repository.js";

describe("DrizzleRoleAssignmentRepository RBAC FK integrity", () => {
  it("fails persistence write when role assignment references missing user or role", async () => {
    const db = {
      insert: () => ({
        values: () => ({
          returning: async () => {
            const err = new Error("insert or update on table violates foreign key constraint");
            (err as Error & { code: string }).code = "23503";
            throw err;
          },
        }),
      }),
    };

    const repo = new DrizzleRoleAssignmentRepository(db as never);

    await expect(
      repo.assignRole("tenant-a", {
        user_id: "missing-user",
        role_id: "missing-role",
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("declares RESTRICT delete behavior for user and role foreign keys", async () => {
    const migration = await readFile(
      new URL("../../migrations/0000_user_management_schema.sql", import.meta.url),
      "utf8",
    );

    expect(migration).toContain("CONSTRAINT fk_role_assignments_tenant_user");
    expect(migration).toContain("CONSTRAINT fk_role_assignments_tenant_role");
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).toContain("ON UPDATE RESTRICT");
  });
});

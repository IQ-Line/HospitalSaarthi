import { describe, expect, it } from "vitest";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleAssignmentRepository } from "../data-access/in-memory-role-assignment-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { projectPrincipalRoles } from "./project-principal-roles.js";

describe("projectPrincipalRoles in-memory alignment", () => {
  it("matches repository seed normalization end-to-end", async () => {
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: { id: "role-1", code: "  charge_nurse  ", display_name: "Charge Nurse" },
      },
    ]);
    await roleAssignmentRepository.assignRole("tenant-a", {
      user_id: "user-1",
      role_id: "role-1",
    });

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      roleAssignmentRepository,
      roleRepository,
    );

    const roles = await projectPrincipalRoles(
      { principalRoleProjectionRepository: projection },
      "tenant-a",
      "user-1",
    );

    expect(roles).toEqual([normalizeRoleCode("  charge_nurse  ")]);
  });
});

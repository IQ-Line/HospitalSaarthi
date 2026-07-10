import { describe, expect, it } from "vitest";
import { normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { projectPrincipalRoles } from "../../../src/use-cases/project-principal-roles.js";

describe("projectPrincipalRoles in-memory alignment", () => {
  it("matches repository seed normalization end-to-end", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: { id: "role-1", code: "  charge_nurse  ", role_type: "  charge_nurse  ", display_name: "Charge Nurse", is_system: false, status: "active" },
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    await userAccessRepository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      actorId: null,
    });

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository,
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

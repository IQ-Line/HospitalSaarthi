import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { updateRole } from "../../../src/use-cases/update-role.js";

const TENANT = "tenant-a";

/** Seed one ordinary role and return the repo + its id, for rename round-trips. */
function seedRole(code = "viewer") {
  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: TENANT,
      role: {
        id: "11111111-1111-4111-8111-111111111111",
        code,
        role_type: "staff",
        display_name: "Viewer",
        description: null,
        is_system: false,
        status: "active",
      },
    },
  ]);
  return { roleRepository, roleId: "11111111-1111-4111-8111-111111111111" };
}

describe("updateRole", () => {
  it("blocks renaming a role TO the reserved platform super-admin code", async () => {
    const { roleRepository, roleId } = seedRole();
    await expect(
      updateRole({ roleRepository }, TENANT, roleId, { code: "super-admin" }),
    ).rejects.toMatchObject({ issue: "role_code_reserved", code: "ROLE_CODE_RESERVED" });

    // the existing role was NOT mutated by the rejected rename
    const after = await roleRepository.getRoleById(TENANT, roleId);
    expect(after?.code).toBe("viewer");
  });

  it("blocks the reserved code regardless of case / whitespace", async () => {
    const { roleRepository, roleId } = seedRole();
    for (const code of [" Super-Admin ", "SUPER-ADMIN"]) {
      await expect(
        updateRole({ roleRepository }, TENANT, roleId, { code }),
      ).rejects.toMatchObject({ issue: "role_code_reserved" });
    }
  });

  it("allows renaming to a non-reserved code", async () => {
    const { roleRepository, roleId } = seedRole();
    const updated = await updateRole({ roleRepository }, TENANT, roleId, { code: "tenant-admin" });
    expect(updated?.code).toBe("tenant-admin");
  });

  it("blocks changing a role's role_type TO the reserved platform code (the second bypass axis)", async () => {
    const { roleRepository, roleId } = seedRole();
    await expect(
      updateRole({ roleRepository }, TENANT, roleId, { role_type: "super-admin" }),
    ).rejects.toMatchObject({ issue: "role_type_reserved", code: "ROLE_TYPE_RESERVED" });
    const after = await roleRepository.getRoleById(TENANT, roleId);
    expect(after?.role_type).toBe("staff");
  });

  it("allows updating other fields without touching the (already non-reserved) code", async () => {
    const { roleRepository, roleId } = seedRole();
    const updated = await updateRole({ roleRepository }, TENANT, roleId, {
      display_name: "Read-only Viewer",
    });
    expect(updated?.display_name).toBe("Read-only Viewer");
    expect(updated?.code).toBe("viewer");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { UserAccessRepository } from "../ports/index.js";
import { InMemoryPrincipalRoleProjectionRepository } from "./in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "./in-memory-role-repository.js";

class StubRoleTemplatesByUser implements Pick<UserAccessRepository, "listRoleTemplatesByUser"> {
  constructor(
    private readonly refs: Array<{
      tenant_id: string;
      user_id: string;
      role_id: string;
    }>,
  ) {}

  async listRoleTemplatesByUser(tenantId: string, userId: string) {
    return this.refs
      .filter((r) => r.tenant_id === tenantId && r.user_id === userId)
      .map((r, index) => ({
        id: `applied-${index}`,
        tenant_id: r.tenant_id,
        user_id: r.user_id,
        role_id: r.role_id,
        assigned_at: new Date(0).toISOString(),
        assigned_by_user_id: null,
        role: null,
      }));
  }
}

describe("InMemoryPrincipalRoleProjectionRepository", () => {
  it("resolves each distinct role_id at most once per listRoleCodesByUser call", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: { id: "role-a", code: "doctor", display_name: "Doctor" },
      },
    ]);
    const getRoleById = vi.spyOn(roleRepository, "getRoleById");

    const userAccessRepository = new StubRoleTemplatesByUser([
      { tenant_id: "tenant-a", user_id: "user-1", role_id: "role-a" },
      { tenant_id: "tenant-a", user_id: "user-1", role_id: "role-a" },
    ]);

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository as unknown as UserAccessRepository,
      roleRepository,
    );
    const codes = await projection.listRoleCodesByUser("tenant-a", "user-1");

    expect(codes).toEqual(["doctor", "doctor"]);
    expect(getRoleById).toHaveBeenCalledTimes(1);
  });

  it("skips assignments whose role is missing (orphan protection)", async () => {
    const userAccessRepository = new StubRoleTemplatesByUser([
      { tenant_id: "tenant-a", user_id: "user-1", role_id: "missing-role" },
    ]);
    const roleRepository = new InMemoryRoleRepository([]);

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository as unknown as UserAccessRepository,
      roleRepository,
    );
    const codes = await projection.listRoleCodesByUser("tenant-a", "user-1");

    expect(codes).toEqual([]);
  });
});

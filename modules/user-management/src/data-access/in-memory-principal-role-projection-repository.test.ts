import { describe, expect, it, vi } from "vitest";
import type { RoleAssignmentRef, RoleAssignmentRepository } from "../ports/index.js";
import { InMemoryPrincipalRoleProjectionRepository } from "./in-memory-principal-role-projection-repository.js";
import { InMemoryRoleAssignmentRepository } from "./in-memory-role-assignment-repository.js";
import { InMemoryRoleRepository } from "./in-memory-role-repository.js";

class StubAssignmentsByUser implements RoleAssignmentRepository {
  constructor(private readonly refs: RoleAssignmentRef[]) {}

  async assignRole(): Promise<never> {
    throw new Error("not implemented");
  }

  async revokeRole(): Promise<null> {
    return null;
  }

  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [];
  }

  async listAssignmentsByUser(tenantId: string, userId: string): Promise<RoleAssignmentRef[]> {
    return this.refs.filter((r) => r.tenant_id === tenantId && r.user_id === userId);
  }

  async listAssignmentsByRole(tenantId: string, roleId: string): Promise<RoleAssignmentRef[]> {
    return this.refs.filter((r) => r.tenant_id === tenantId && r.role_id === roleId);
  }

  async listAssignmentsByTenant(
    tenantId: string,
    filter?: Readonly<{ userId?: string; roleId?: string }>,
  ): Promise<RoleAssignmentRef[]> {
    return this.refs.filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (filter?.userId && r.user_id !== filter.userId) return false;
      if (filter?.roleId && r.role_id !== filter.roleId) return false;
      return true;
    });
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

    const assignmentRepository = new StubAssignmentsByUser([
      { id: "a1", tenant_id: "tenant-a", user_id: "user-1", role_id: "role-a" },
      { id: "a2", tenant_id: "tenant-a", user_id: "user-1", role_id: "role-a" },
    ]);

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      assignmentRepository,
      roleRepository,
    );
    const codes = await projection.listRoleCodesByUser("tenant-a", "user-1");

    expect(codes).toEqual(["doctor", "doctor"]);
    expect(getRoleById).toHaveBeenCalledTimes(1);
  });

  it("skips assignments whose role is missing (orphan protection)", async () => {
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository([]);
    await roleAssignmentRepository.assignRole("tenant-a", {
      user_id: "user-1",
      role_id: "missing-role",
    });

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      roleAssignmentRepository,
      roleRepository,
    );
    const codes = await projection.listRoleCodesByUser("tenant-a", "user-1");

    expect(codes).toEqual([]);
  });
});

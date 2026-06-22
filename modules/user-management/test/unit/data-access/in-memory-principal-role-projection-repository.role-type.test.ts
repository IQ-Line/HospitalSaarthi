import { describe, expect, it, vi } from "vitest";
import type { UserAccessRepository } from "../../../src/ports/index.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";

class StubRoleTemplatesByUser implements Pick<UserAccessRepository, "listRoleTemplatesByUser"> {
  constructor(
    private readonly refs: Array<{ tenant_id: string; user_id: string; role_id: string }>,
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
        role: {
          id: r.role_id,
          code: "stub-role",
          role_type: "stub-role",
          display_name: "Stub Role",
          is_system: false,
          status: "active" as const,
        },
      }));
  }
}

describe("InMemoryPrincipalRoleProjectionRepository role_type", () => {
  it("includes role_type in codes when it differs from code", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "role-a",
          code: "doctor-cardiology",
          role_type: "doctor",
          display_name: "Cardiology Doctor",
          is_system: false,
          status: "active" as const,
        },
      },
    ]);

    const projection = new InMemoryPrincipalRoleProjectionRepository(
      new StubRoleTemplatesByUser([
        { tenant_id: "tenant-a", user_id: "user-1", role_id: "role-a" },
      ]) as unknown as UserAccessRepository,
      roleRepository,
    );

    const codes = await projection.listRoleCodesByUser("tenant-a", "user-1");
    expect(codes).toEqual(["doctor-cardiology", "doctor"]);
  });
});

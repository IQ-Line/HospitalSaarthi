import { describe, expect, it } from "vitest";
import type { UserAccessRepository } from "../../../src/ports/index.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { projectPrincipalRoles } from "../../../src/use-cases/project-principal-roles.js";
import { isReservedRoleCode } from "../../../src/domain/reserved-role-codes.js";
import { normalizeRoleCode } from "../../../src/domain/normalize-role-code.js";

/**
 * The projection looks the role up via the RoleRepository, not via this ref's `role`
 * field — so the seeded RoleRepository row (below) is what matters. Mirrors the existing
 * in-memory-principal-role-projection-repository.role-type test.
 */
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
          code: "ignored",
          role_type: "ignored",
          display_name: "Ignored",
          is_system: false,
          status: "active" as const,
        },
      }));
  }
}

/**
 * Proves WHY the reservation must cover role_type, not just code. The projection promotes
 * role_type into the principal's role codes, so a role with a benign `code` but
 * role_type="super-admin" injects the reserved "super-admin" value into the principal. Platform
 * authority no longer flows from that string (it flows from scope:platform), but the reservation
 * still blocks a tenant from minting a confusingly-named platform role via EITHER axis — which is
 * why create-role / update-role reserve role_type as well as code.
 *
 * Uses the real projection adapter (a faithful replica of the Drizzle one's code+role_type
 * promotion), the real projectPrincipalRoles use-case, and the real reservation guard.
 */
describe("role_type promotion justifies reserving role_type (not just code)", () => {
  it("a role with role_type='super-admin' injects the reserved code into the principal", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "role-helper",
          code: "helper", // benign, non-reserved code
          role_type: "super-admin", // the smuggled axis
          display_name: "Helper",
          is_system: false,
          status: "active" as const,
        },
      },
    ]);
    const projection = new InMemoryPrincipalRoleProjectionRepository(
      new StubRoleTemplatesByUser([
        { tenant_id: "tenant-a", user_id: "user-1", role_id: "role-helper" },
      ]) as unknown as UserAccessRepository,
      roleRepository,
    );

    const principalRoles = await projectPrincipalRoles(
      { principalRoleProjectionRepository: projection },
      "tenant-a",
      "user-1",
    );

    // the smuggled role_type reaches the principal role set...
    expect(principalRoles).toContain("super-admin");
    // ...and it normalizes to the RESERVED code, so create/update-role must block it at source.
    expect(principalRoles.some((r) => isReservedRoleCode(normalizeRoleCode(r)))).toBe(true);
  });
});

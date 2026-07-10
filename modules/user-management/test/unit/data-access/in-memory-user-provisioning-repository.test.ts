import { describe, expect, it } from "vitest";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserProvisioningRepository } from "../../../src/data-access/in-memory-user-provisioning-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";

describe("InMemoryUserProvisioningRepository", () => {
  it("writes direct capabilities as grant overrides and role templates as membership only", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "role-1",
          code: "registrar",
          role_type: "registrar",
          display_name: "Registrar",
          is_system: false,
          status: "active",
        },
      },
    ]);
    const userRepository = new InMemoryUserRepository();
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    const provisioningRepository = new InMemoryUserProvisioningRepository(
      userRepository,
      userAccessRepository,
    );

    const userId = "f47ac10b-58cc-4372-a567-0e02b2c3d600";
    await provisioningRepository.provisionUserWithAccess("tenant-a", {
      userId,
      user: {
        full_name: "Provisioned User",
        username: "provisioned.user",
        email: "provisioned@example.com",
        password: "password123",
      },
      recoveryTier: "standard",
      authUserId: "auth-1",
      manualCapabilityIds: ["shared-cap"],
      roleTemplateGrants: [{ roleId: "role-1" }],
      actorId: "admin-manual",
    });

    // ADR-0037: the direct capability lands as a grant OVERRIDE; the role template contributes only
    // a membership (role capabilities are read live), so it writes NO user_capabilities rows.
    const overrides = await userAccessRepository.listActiveCapabilityGrantsByUser("tenant-a", userId);
    expect(overrides).toEqual([
      expect.objectContaining({
        capability_id: "shared-cap",
        effect: "grant",
        granted_by_user_id: "admin-manual",
      }),
    ]);
    expect(overrides.some((override) => override.capability_id === "template-cap")).toBe(false);

    const memberships = await userAccessRepository.listRoleTemplatesByUser("tenant-a", userId);
    expect(memberships.map((m) => m.role_id)).toEqual(["role-1"]);
  });
});

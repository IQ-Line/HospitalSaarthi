import { describe, expect, it } from "vitest";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserProvisioningRepository } from "../../../src/data-access/in-memory-user-provisioning-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";

describe("InMemoryUserProvisioningRepository", () => {
  it("preserves manual grants when role template overlaps during provisionUserWithAccess", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "role-1",
          code: "registrar",
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
      roleTemplateGrants: [{ roleId: "role-1", capabilityIds: ["shared-cap", "template-cap"] }],
      actorId: "admin-manual",
    });

    const active = await userAccessRepository.listActiveCapabilityGrantsByUser("tenant-a", userId);
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "shared-cap",
          grant_source: "manual",
          source_role_id: null,
          granted_by_user_id: "admin-manual",
        }),
        expect.objectContaining({
          capability_id: "template-cap",
          grant_source: "role_template",
          source_role_id: "role-1",
          granted_by_user_id: "admin-manual",
        }),
      ]),
    );
    expect(active.filter((grant) => grant.capability_id === "shared-cap")).toHaveLength(1);
  });
});

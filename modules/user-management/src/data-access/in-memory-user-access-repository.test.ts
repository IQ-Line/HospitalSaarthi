import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "./in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "./in-memory-user-access-repository.js";

describe("InMemoryUserAccessRepository", () => {
  it("copies template capabilities into persisted user grants and keeps them after detach", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b", "cap-a"],
      actorId: "admin-1",
    });

    await repository.detachRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
    });

    await expect(repository.listRoleTemplatesByUser("tenant-a", "user-1")).resolves.toEqual([]);
    await expect(repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "cap-a",
          grant_source: "role_template",
          source_role_id: "role-1",
        }),
        expect.objectContaining({
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: "role-1",
        }),
      ]),
    );
  });

  it("replaces only manual grants and preserves copied template grants", async () => {
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "role-1",
          code: "admin",
          display_name: "Admin",
          is_system: false,
          status: "active",
        },
      },
    ]);
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["copied-cap"],
      actorId: "admin-1",
    });
    await repository.replaceManualCapabilityGrants("tenant-a", {
      userId: "user-1",
      capabilityIds: ["manual-a", "manual-b"],
      actorId: "admin-1",
    });
    await repository.replaceManualCapabilityGrants("tenant-a", {
      userId: "user-1",
      capabilityIds: ["manual-b"],
      actorId: "admin-2",
    });

    await expect(repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "copied-cap",
          grant_source: "role_template",
        }),
        expect.objectContaining({
          capability_id: "manual-b",
          grant_source: "manual",
          granted_by_user_id: "admin-1",
        }),
      ]),
    );
    await expect(repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1")).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "manual-a",
        }),
      ]),
    );
  });
});

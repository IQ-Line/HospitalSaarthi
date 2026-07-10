import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";

// ADR-0037: applyRoleTemplate writes ONLY a role membership (role capabilities are read live from
// role_capabilities, never copied), and user_capabilities is exclusively grant/deny overrides.

function repositoryWithRole(roleId = "role-1") {
  const roleRepository = new InMemoryRoleRepository([
    {
      tenantId: "tenant-a",
      role: {
        id: roleId,
        code: "registrar",
        role_type: "registrar",
        display_name: "Registrar",
        is_system: false,
        status: "active",
      },
    },
  ]);
  return new InMemoryUserAccessRepository((tenantId, id) => roleRepository.getRoleById(tenantId, id));
}

describe("InMemoryUserAccessRepository", () => {
  it("applyRoleTemplate stores only a membership and writes no capability override rows", async () => {
    const repository = repositoryWithRole();

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      actorId: "admin-1",
    });

    await expect(repository.listRoleTemplatesByUser("tenant-a", "user-1")).resolves.toEqual([
      expect.objectContaining({ role_id: "role-1", assigned_by_user_id: "admin-1" }),
    ]);
    await expect(
      repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1"),
    ).resolves.toEqual([]);
  });

  it("detachRoleTemplate removes the membership and leaves overrides untouched", async () => {
    const repository = repositoryWithRole();

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      actorId: "admin-1",
    });
    await repository.replaceCapabilityOverrides("tenant-a", {
      userId: "user-1",
      grants: [{ capability_id: "cap-grant" }],
      denies: [],
      actorId: "admin-1",
    });

    await repository.detachRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      actorId: "admin-2",
    });

    await expect(repository.listRoleTemplatesByUser("tenant-a", "user-1")).resolves.toEqual([]);
    // The override is independent of role lifecycle (ADR-0037) — it survives the detach.
    await expect(
      repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1"),
    ).resolves.toEqual([
      expect.objectContaining({ capability_id: "cap-grant", effect: "grant" }),
    ]);
  });

  it("replaceCapabilityOverrides persists grant and deny rows with reasons", async () => {
    const repository = repositoryWithRole();

    const result = await repository.replaceCapabilityOverrides("tenant-a", {
      userId: "user-1",
      grants: [{ capability_id: "cap-grant", reason: "extra duty" }],
      denies: [{ capability_id: "cap-deny", reason: "under supervision" }],
      actorId: "admin-1",
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "cap-grant",
          effect: "grant",
          reason: "extra duty",
          granted_by_user_id: "admin-1",
        }),
        expect.objectContaining({
          capability_id: "cap-deny",
          effect: "deny",
          reason: "under supervision",
          granted_by_user_id: "admin-1",
        }),
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("deny wins when a capability appears in both grant and deny lists", async () => {
    const repository = repositoryWithRole();

    const result = await repository.replaceCapabilityOverrides("tenant-a", {
      userId: "user-1",
      grants: [{ capability_id: "cap-x" }],
      denies: [{ capability_id: "cap-x", reason: "explicitly restricted" }],
      actorId: "admin-1",
    });

    // A single row for cap-x, resolved to deny (deny wins over grant).
    expect(result).toEqual([
      expect.objectContaining({ capability_id: "cap-x", effect: "deny", reason: "explicitly restricted" }),
    ]);
  });

  it("is full-replace: a subsequent call clears the previous override set", async () => {
    const repository = repositoryWithRole();

    await repository.replaceCapabilityOverrides("tenant-a", {
      userId: "user-1",
      grants: [{ capability_id: "cap-a" }, { capability_id: "cap-b" }],
      denies: [],
      actorId: "admin-1",
    });
    const result = await repository.replaceCapabilityOverrides("tenant-a", {
      userId: "user-1",
      grants: [{ capability_id: "cap-b" }],
      denies: [],
      actorId: "admin-2",
    });

    expect(result).toEqual([
      expect.objectContaining({ capability_id: "cap-b", effect: "grant", granted_by_user_id: "admin-2" }),
    ]);
    expect(result.some((override) => override.capability_id === "cap-a")).toBe(false);
  });
});

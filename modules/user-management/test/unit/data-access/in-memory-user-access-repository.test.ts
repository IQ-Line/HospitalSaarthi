import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";

describe("InMemoryUserAccessRepository", () => {
  it("revokes role_template grants scoped to the detached role while preserving manual grants", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b", "cap-a"],
      actorId: "admin-1",
    });

    await repository.replaceManualCapabilityGrants("tenant-a", {
      userId: "user-1",
      capabilityIds: ["cap-manual"],
      actorId: "admin-1",
    });

    await repository.detachRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      actorId: "admin-2",
    });

    await expect(repository.listRoleTemplatesByUser("tenant-a", "user-1")).resolves.toEqual([]);
    await expect(repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1")).resolves.toEqual([
      expect.objectContaining({
        capability_id: "cap-manual",
        grant_source: "manual",
      }),
    ]);

    const userKey = "tenant-a\0user-1";
    const allGrants = [
      ...((repository as unknown as {
        capabilityGrants: Map<
          string,
          Map<
            string,
            {
              capability_id: string;
              grant_source: string;
              revoked_at: string | null;
              revoked_by_user_id: string | null;
            }
          >
        >;
      }).capabilityGrants.get(userKey)?.values() ?? []),
    ];
    const revokedTemplateGrants = allGrants.filter(
      (grant) => grant.grant_source === "role_template" && grant.revoked_at !== null,
    );
    expect(revokedTemplateGrants.map((grant) => grant.capability_id).sort()).toEqual(["cap-a", "cap-b"]);
    expect(revokedTemplateGrants.every((grant) => grant.revoked_by_user_id === "admin-2")).toBe(true);
  });

  it("applyRoleTemplate preserves active manual grant provenance when template overlaps", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    const manualGrantedAt = "2026-01-01T00:00:00.000Z";
    const userKey = "tenant-a\0user-1";
    const grants = new Map([
      [
        "shared-cap",
        {
          id: "grant-manual-1",
          user_id: "user-1",
          capability_id: "shared-cap",
          capability_key: "shared-cap",
          module: "user-management",
          feature: "unknown",
          action: "unknown",
          display_name: "shared-cap",
          description: null,
          grant_source: "manual" as const,
          source_role_id: null,
          granted_by_user_id: "admin-manual",
          granted_at: manualGrantedAt,
          revoked_at: null,
          revoked_by_user_id: null,
        },
      ],
    ]);
    (repository as unknown as { capabilityGrants: Map<string, Map<string, unknown>> }).capabilityGrants.set(
      userKey,
      grants,
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["shared-cap", "template-only-cap"],
      actorId: "admin-template",
    });

    const active = await repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1");
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "shared-cap",
          grant_source: "manual",
          source_role_id: null,
          granted_by_user_id: "admin-manual",
          granted_at: manualGrantedAt,
        }),
        expect.objectContaining({
          capability_id: "template-only-cap",
          grant_source: "role_template",
          source_role_id: "role-1",
          granted_by_user_id: "admin-template",
        }),
      ]),
    );
    expect(active.filter((grant) => grant.capability_id === "shared-cap")).toHaveLength(1);
  });

  it("re-apply with a narrower subset revokes removed role_template grants for that role", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b", "cap-c"],
      actorId: "admin-1",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a"],
      actorId: "admin-2",
    });

    const active = await repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1");
    expect(active).toEqual([
      expect.objectContaining({
        capability_id: "cap-a",
        grant_source: "role_template",
        source_role_id: "role-1",
      }),
    ]);
    expect(active.some((grant) => grant.capability_id === "cap-b")).toBe(false);
    expect(active.some((grant) => grant.capability_id === "cap-c")).toBe(false);
  });

  it("re-apply with a wider subset adds missing role_template grants", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a"],
      actorId: "admin-1",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b"],
      actorId: "admin-2",
    });

    const active = await repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1");
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capability_id: "cap-a", grant_source: "role_template" }),
        expect.objectContaining({
          capability_id: "cap-b",
          grant_source: "role_template",
          granted_by_user_id: "admin-2",
        }),
      ]),
    );
  });

  it("manual grants survive role_template re-apply synchronization", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.replaceManualCapabilityGrants("tenant-a", {
      userId: "user-1",
      capabilityIds: ["shared-cap"],
      actorId: "admin-manual",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["shared-cap", "cap-b"],
      actorId: "admin-template",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-b"],
      actorId: "admin-template-2",
    });

    const active = await repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1");
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "shared-cap",
          grant_source: "manual",
          source_role_id: null,
          granted_by_user_id: "admin-manual",
        }),
        expect.objectContaining({
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: "role-1",
        }),
      ]),
    );
    expect(active.some((grant) => grant.capability_id === "shared-cap" && grant.grant_source === "manual")).toBe(
      true,
    );
  });

  it("re-apply reactivates a revoked role_template grant for the same role", async () => {
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
    const repository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b"],
      actorId: "admin-1",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a"],
      actorId: "admin-2",
    });

    await repository.applyRoleTemplate("tenant-a", {
      userId: "user-1",
      roleId: "role-1",
      capabilityIds: ["cap-a", "cap-b"],
      actorId: "admin-3",
    });

    const active = await repository.listActiveCapabilityGrantsByUser("tenant-a", "user-1");
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "cap-b",
          grant_source: "role_template",
          source_role_id: "role-1",
          revoked_at: null,
          granted_by_user_id: "admin-3",
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
          role_type: "admin",
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

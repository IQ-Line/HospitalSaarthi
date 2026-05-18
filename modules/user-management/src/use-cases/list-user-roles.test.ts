import { describe, expect, it } from "vitest";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import { UserNotFoundError } from "../domain/errors.js";
import { listUserRoles } from "./list-user-roles.js";

describe("listUserRoles", () => {
  it("returns only tenant-scoped roles assigned to the requested user", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d510", {
      full_name: "Assigned User",
    });
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d500",
          code: "doctor",
          display_name: "Doctor",
          is_system: false,
          status: "active",
        },
      },
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d501",
          code: "admin",
          display_name: "Admin",
          is_system: false,
          status: "active",
        },
      },
      {
        tenantId: "tenant-b",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d502",
          code: "doctor",
          display_name: "Doctor Tenant B",
          is_system: false,
          status: "active",
        },
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );

    await userAccessRepository.applyRoleTemplate("tenant-a", {
      userId: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d501",
      capabilityIds: [],
      actorId: null,
    });
    await userAccessRepository.applyRoleTemplate("tenant-a", {
      userId: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d500",
      capabilityIds: [],
      actorId: null,
    });
    await userAccessRepository.applyRoleTemplate("tenant-b", {
      userId: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d502",
      capabilityIds: [],
      actorId: null,
    });

    await expect(
      listUserRoles(
        { userRepository, userAccessRepository },
        "tenant-a",
        "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d501",
        role: expect.objectContaining({
          code: "admin",
        }),
      }),
      expect.objectContaining({
        role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d500",
        role: expect.objectContaining({
          code: "doctor",
        }),
      }),
    ]);
  });

  it("returns an empty list when the user has no role assignments", async () => {
    const userRepository = new InMemoryUserRepository();
    userRepository.insertUserWithId("tenant-a", "f47ac10b-58cc-4372-a567-0e02b2c3d511", {
      full_name: "Unassigned User",
    });

    await expect(
      listUserRoles(
        {
          userRepository,
          userAccessRepository: new InMemoryUserAccessRepository(async () => null),
        },
        "tenant-a",
        "f47ac10b-58cc-4372-a567-0e02b2c3d511",
      ),
    ).resolves.toEqual([]);
  });

  it("throws when the user does not exist in the active tenant", async () => {
    await expect(
      listUserRoles(
        {
          userRepository: new InMemoryUserRepository(),
          userAccessRepository: new InMemoryUserAccessRepository(async () => null),
        },
        "tenant-a",
        "f47ac10b-58cc-4372-a567-0e02b2c3d512",
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});

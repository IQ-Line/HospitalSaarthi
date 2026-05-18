import { describe, expect, it } from "vitest";
import { InMemoryRoleAssignmentRepository } from "../data-access/in-memory-role-assignment-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
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
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();

    await roleAssignmentRepository.assignRole("tenant-a", {
      user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d501",
    });
    await roleAssignmentRepository.assignRole("tenant-a", {
      user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d500",
    });
    await roleAssignmentRepository.assignRole("tenant-b", {
      user_id: "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d502",
    });

    await expect(
      listUserRoles(
        { userRepository, roleAssignmentRepository, roleRepository },
        "tenant-a",
        "f47ac10b-58cc-4372-a567-0e02b2c3d510",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d501",
        code: "admin",
      }),
      expect.objectContaining({
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d500",
        code: "doctor",
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
          roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
          roleRepository: new InMemoryRoleRepository(),
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
          roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
          roleRepository: new InMemoryRoleRepository(),
        },
        "tenant-a",
        "f47ac10b-58cc-4372-a567-0e02b2c3d512",
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});

import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it } from "vitest";
import { RoleNotFoundError, UserNotFoundError } from "../domain/errors.js";
import type {
  AssignRoleInput,
  Role,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
  RoleRepository,
  User,
  UserRepository,
} from "../ports/index.js";
import { assignRole } from "./assign-role.js";

class TestEventBus implements EventBus {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(_event: DomainEvent): Promise<void> {}
  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

class StubUserRepository implements UserRepository {
  constructor(private readonly user: User | null) {}
  async createUser(): Promise<User> {
    throw new Error("not implemented");
  }
  async getUserById(): Promise<User | null> {
    return this.user;
  }
  async updateUser(): Promise<User | null> {
    throw new Error("not implemented");
  }
}

class StubRoleRepository implements RoleRepository {
  constructor(private readonly role: Role | null) {}
  async getRoleById(): Promise<Role | null> {
    return this.role;
  }
}

class StubRoleAssignmentRepository implements RoleAssignmentRepository {
  async assignRole(_tenantId: string, input: AssignRoleInput): Promise<RoleAssignment> {
    return { id: "assignment-1", user_id: input.user_id, role_id: input.role_id };
  }
  async revokeRole(): Promise<RoleAssignment | null> {
    return null;
  }
  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [];
  }
  async listAssignmentsByUser(_tenantId: string, _userId: string): Promise<RoleAssignmentRef[]> {
    return [];
  }
}

describe("assignRole", () => {
  it("rejects assignment when user does not exist", async () => {
    const eventBus = new TestEventBus();

    await expect(
      assignRole(
        {
          userRepository: new StubUserRepository(null),
          roleRepository: new StubRoleRepository({
            id: "role-1",
            code: "doctor",
            display_name: "Doctor",
          }),
          roleAssignmentRepository: new StubRoleAssignmentRepository(),
          eventBus,
        },
        {
          tenantId: "tenant-a",
          actorId: "actor-a",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        },
        { user_id: "user-missing", role_id: "role-1" },
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("rejects assignment when role does not exist", async () => {
    const eventBus = new TestEventBus();

    await expect(
      assignRole(
        {
          userRepository: new StubUserRepository({
            id: "user-1",
            full_name: "User One",
            status: "active",
          }),
          roleRepository: new StubRoleRepository(null),
          roleAssignmentRepository: new StubRoleAssignmentRepository(),
          eventBus,
        },
        {
          tenantId: "tenant-a",
          actorId: "actor-a",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        },
        { user_id: "user-1", role_id: "role-missing" },
      ),
    ).rejects.toBeInstanceOf(RoleNotFoundError);
  });
});

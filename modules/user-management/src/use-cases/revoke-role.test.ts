import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import {
  RoleAssignmentNotFoundError,
  RoleNotFoundError,
  UserNotFoundError,
} from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_ROLE_REVOKED } from "../events/constants.js";
import type {
  AssignRoleInput,
  ListUsersOptions,
  Role,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
  RoleRepository,
  User,
  UserRepository,
  UserWithTenant,
} from "../ports/index.js";
import { revokeRole } from "./revoke-role.js";

class TestEventBus implements EventBus {
  published: DomainEvent[] = [];
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }
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
  async findUserByGlobalId(): Promise<UserWithTenant | null> {
    return null;
  }
  async listUsers(_tenantId: string, _options?: ListUsersOptions): Promise<User[]> {
    return [];
  }
  async updateUser(): Promise<User | null> {
    return null;
  }
}

class StubRoleRepository implements RoleRepository {
  constructor(private readonly role: Role | null) {}
  async getRoleById(): Promise<Role | null> {
    return this.role;
  }
}

class StubRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly revoked: RoleAssignment | null) {}
  async assignRole(): Promise<RoleAssignment> {
    throw new Error("not implemented");
  }
  async revokeRole(): Promise<RoleAssignment | null> {
    return this.revoked;
  }
  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [];
  }
  async listAssignmentsByUser(): Promise<RoleAssignmentRef[]> {
    return [];
  }
}

describe("revokeRole", () => {
  const user: User = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
    full_name: "U",
    status: "active",
  };
  const role: Role = { id: "f47ac10b-58cc-4372-a567-0e02b2c3d482", code: "r", display_name: "R" };
  const input: AssignRoleInput = { user_id: user.id, role_id: role.id };

  it("throws when assignment did not exist", async () => {
    const eventBus = new TestEventBus();
    await expect(
      revokeRole(
        {
          userRepository: new StubUserRepository(user),
          roleRepository: new StubRoleRepository(role),
          roleAssignmentRepository: new StubRoleAssignmentRepository(null),
          eventBus,
        },
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        },
        input,
      ),
    ).rejects.toBeInstanceOf(RoleAssignmentNotFoundError);
    expect(eventBus.published).toHaveLength(0);
  });

  it("publishes role.revoked when row removed", async () => {
    const eventBus = new TestEventBus();
    const revoked: RoleAssignment = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d499",
      user_id: user.id,
      role_id: role.id,
    };
    const publishSpy = vi.spyOn(eventBus, "publish");
    const out = await revokeRole(
      {
        userRepository: new StubUserRepository(user),
        roleRepository: new StubRoleRepository(role),
        roleAssignmentRepository: new StubRoleAssignmentRepository(revoked),
        eventBus,
      },
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      },
      input,
    );
    expect(out).toEqual(revoked);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0]?.[0]?.event_type).toBe(USER_MANAGEMENT_EVENT_ROLE_REVOKED);
  });

  it("rejects when user missing", async () => {
    const eventBus = new TestEventBus();
    await expect(
      revokeRole(
        {
          userRepository: new StubUserRepository(null),
          roleRepository: new StubRoleRepository(role),
          roleAssignmentRepository: new StubRoleAssignmentRepository({
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d497",
            user_id: user.id,
            role_id: role.id,
          }),
          eventBus,
        },
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        },
        input,
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("rejects when role missing", async () => {
    const eventBus = new TestEventBus();
    await expect(
      revokeRole(
        {
          userRepository: new StubUserRepository(user),
          roleRepository: new StubRoleRepository(null),
          roleAssignmentRepository: new StubRoleAssignmentRepository({
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d496",
            user_id: user.id,
            role_id: role.id,
          }),
          eventBus,
        },
        {
          tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d480",
          actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        },
        input,
      ),
    ).rejects.toBeInstanceOf(RoleNotFoundError);
  });
});

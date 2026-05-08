import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type {
  AssignRoleInput,
  CreateUserInput,
  Role,
  RoleAssignment,
  RoleAssignmentRef,
  RoleAssignmentRepository,
  PrincipalRoleProjectionRepository,
  RoleRepository,
  UpdateUserInput,
  User,
  UserRepository,
} from "./ports/index.js";
import { RbacIntegrityViolationError } from "./domain/errors.js";
import { userManagementPlugin } from "./router.js";

class TestEventBus implements EventBus {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(_event: DomainEvent): Promise<void> {}
  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

class EmptyUserRepository implements UserRepository {
  async createUser(_tenantId: string, _input: CreateUserInput): Promise<User> {
    throw new Error("not implemented");
  }
  async getUserById(_tenantId: string, _userId: string): Promise<User | null> {
    return null;
  }
  async updateUser(
    _tenantId: string,
    _userId: string,
    _input: UpdateUserInput,
  ): Promise<User | null> {
    return null;
  }
}

class EmptyRoleRepository implements RoleRepository {
  async getRoleById(_tenantId: string, _roleId: string): Promise<Role | null> {
    return null;
  }
}

class NoopPrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  async listRoleCodesByUser(): Promise<string[]> {
    return [];
  }
  clearCache(): void {}
}

class OrphanRoleAssignmentRepository implements RoleAssignmentRepository {
  async assignRole(_tenantId: string, _input: AssignRoleInput): Promise<RoleAssignment> {
    throw new Error("not implemented");
  }
  async revokeRole(): Promise<RoleAssignment | null> {
    return null;
  }
  async listAssignments(): Promise<RoleAssignmentRef[]> {
    return [
      {
        tenant_id: "tenant-a",
        user_id: "orphan-user",
        role_id: "orphan-role",
      },
    ];
  }
  async listAssignmentsByUser(_tenantId: string, _userId: string): Promise<RoleAssignmentRef[]> {
    return [];
  }
}

describe("RBAC integrity", () => {
  it("fails startup when orphan role assignments exist", async () => {
    const app = Fastify();

    await expect(
      app.register(userManagementPlugin, {
        eventBus: new TestEventBus(),
        userRepository: new EmptyUserRepository(),
        roleRepository: new EmptyRoleRepository(),
        roleAssignmentRepository: new OrphanRoleAssignmentRepository(),
        principalRoleProjectionRepository: new NoopPrincipalRoleProjectionRepository(),
      }),
    ).rejects.toBeInstanceOf(RbacIntegrityViolationError);

    await app.close();
  });
});

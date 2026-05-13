import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleAssignmentRepository } from "../data-access/in-memory-role-assignment-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import type {
  AuthAccountProvisioner,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
  CreateUserInput,
} from "../ports/index.js";
import { createUser } from "./create-user.js";

class TestEventBus implements EventBus {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(_event: DomainEvent): Promise<void> {}
  async subscribe(_eventType: string, _handler: EventHandler): Promise<Subscription> {
    return { async unsubscribe(): Promise<void> {} };
  }
}

class AuthAccountProvisionerStub implements AuthAccountProvisioner {
  readonly createPasswordAccount = vi.fn(
    async (
      input: CreatePasswordAuthAccountInput,
    ): Promise<CreatePasswordAuthAccountResult> => ({
      authUserId: input.platformUserId,
    }),
  );
}

describe("createUser", () => {
  it("rejects non-string full_name", async () => {
    await expect(
      createUser(
        {
          userRepository: new InMemoryUserRepository(),
          roleRepository: new InMemoryRoleRepository(),
          roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
          principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
            new InMemoryRoleAssignmentRepository(),
            new InMemoryRoleRepository(),
          ),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
          eventBus: new TestEventBus(),
        },
        {
          tenantId: "t1",
          actorId: "a1",
          correlationId: "c1",
        },
        { full_name: 123, email: "bad@example.com", password: "password123" } as unknown as CreateUserInput,
      ),
    ).rejects.toMatchObject({ issue: "full_name_invalid_type" });
  });

  it("rejects blank full_name", async () => {
    await expect(
      createUser(
        {
          userRepository: new InMemoryUserRepository(),
          roleRepository: new InMemoryRoleRepository(),
          roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
          principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
            new InMemoryRoleAssignmentRepository(),
            new InMemoryRoleRepository(),
          ),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
          eventBus: new TestEventBus(),
        },
        {
          tenantId: "t1",
          actorId: "a1",
          correlationId: "c1",
        },
        { full_name: "   ", email: "blank@example.com", password: "password123" },
      ),
    ).rejects.toMatchObject({ issue: "full_name_empty" });
  });

  it("provisions the login account, links auth_user_id, and assigns selected roles", async () => {
    const userRepository = new InMemoryUserRepository();
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
          code: "registrar",
          display_name: "Registrar",
          status: "active",
          is_system: false,
        },
      },
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
          code: "auditor",
          display_name: "Auditor",
          status: "active",
          is_system: false,
        },
      },
    ]);
    const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
    const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
      roleAssignmentRepository,
      roleRepository,
    );
    const authAccountProvisioner = new AuthAccountProvisionerStub();

    const created = await createUser(
      {
        userRepository,
        roleRepository,
        roleAssignmentRepository,
        principalRoleProjectionRepository,
        authAccountProvisioner,
        eventBus: new TestEventBus(),
      },
      {
        tenantId: "tenant-a",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d613",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d614",
      },
      {
        full_name: "New User",
        email: "new.user@example.com",
        password: "password123",
        role_ids: [
          "f47ac10b-58cc-4372-a567-0e02b2c3d611",
          "f47ac10b-58cc-4372-a567-0e02b2c3d612",
        ],
      },
    );

    expect(authAccountProvisioner.createPasswordAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        platformUserId: created.id,
        tenantId: "tenant-a",
        email: "new.user@example.com",
        password: "password123",
      }),
    );
    expect(created.auth_user_id).toBe(created.id);
    await expect(
      roleAssignmentRepository.listAssignmentsByUser("tenant-a", created.id),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
        }),
        expect.objectContaining({
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
        }),
      ]),
    );
  });
});

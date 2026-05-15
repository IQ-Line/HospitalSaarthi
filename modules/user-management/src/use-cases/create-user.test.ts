import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
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
          capabilityRepository: new InMemoryCapabilityRepository(),
          roleRepository: new InMemoryRoleRepository(),
          roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
          userAccessRepository: new InMemoryUserAccessRepository(async () => null),
          principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
            new InMemoryUserAccessRepository(async () => null),
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
          capabilityRepository: new InMemoryCapabilityRepository(),
          roleRepository: new InMemoryRoleRepository(),
          roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
          userAccessRepository: new InMemoryUserAccessRepository(async () => null),
          principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
            new InMemoryUserAccessRepository(async () => null),
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

  it("provisions the login account, links auth_user_id, and applies selected access grants", async () => {
    const userRepository = new InMemoryUserRepository();
    const capabilityRepository = new InMemoryCapabilityRepository([
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d610",
          capability_key: "um:user:create",
          module: "user-management",
          feature: "users",
          action: "create",
          display_name: "Create users",
          description: null,
          is_active: true,
        },
      },
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
          capability_key: "um:user:read",
          module: "user-management",
          feature: "users",
          action: "read",
          display_name: "Read users",
          description: null,
          is_active: true,
        },
      },
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
          capability_key: "um:role:assign",
          module: "user-management",
          feature: "roles",
          action: "assign",
          display_name: "Assign roles",
          description: null,
          is_active: true,
        },
      },
    ]);
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
          code: "registrar",
          display_name: "Registrar",
          status: "active",
          is_system: false,
        },
      },
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d622",
          code: "auditor",
          display_name: "Auditor",
          status: "active",
          is_system: false,
        },
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([
      {
        tenantId: "tenant-a",
        roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
        capabilities: [
          (await capabilityRepository.getCapabilityById("f47ac10b-58cc-4372-a567-0e02b2c3d611"))!,
        ],
      },
      {
        tenantId: "tenant-a",
        roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d622",
        capabilities: [
          (await capabilityRepository.getCapabilityById("f47ac10b-58cc-4372-a567-0e02b2c3d612"))!,
        ],
      },
    ]);
    const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository,
      roleRepository,
    );
    const authAccountProvisioner = new AuthAccountProvisionerStub();

    const created = await createUser(
      {
        userRepository,
        capabilityRepository,
        roleRepository,
        roleCapabilityRepository,
        userAccessRepository,
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
        capability_ids: ["f47ac10b-58cc-4372-a567-0e02b2c3d610"],
        role_template_ids: [
          "f47ac10b-58cc-4372-a567-0e02b2c3d621",
          "f47ac10b-58cc-4372-a567-0e02b2c3d622",
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
    await expect(userAccessRepository.listRoleTemplatesByUser("tenant-a", created.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
        }),
        expect.objectContaining({
          role_id: "f47ac10b-58cc-4372-a567-0e02b2c3d622",
        }),
      ]),
    );
    await expect(
      userAccessRepository.listActiveCapabilityGrantsByUser("tenant-a", created.id),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "f47ac10b-58cc-4372-a567-0e02b2c3d610",
          grant_source: "manual",
        }),
        expect.objectContaining({
          capability_id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
          grant_source: "role_template",
        }),
        expect.objectContaining({
          capability_id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
          grant_source: "role_template",
        }),
      ]),
    );
  });
});

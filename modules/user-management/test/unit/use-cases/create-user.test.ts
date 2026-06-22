import type { DomainEvent, EventBus, EventHandler, Subscription } from "@hims/ts-sdk-events";
import { describe, expect, it, vi } from "vitest";
import { ModuleEntitlementLookupError, UnexpectedPersistenceError } from "../../../src/domain/errors.js";
import { InMemoryCapabilityRepository } from "../../../src/data-access/in-memory-capability-repository.js";
import { InMemoryUserProvisioningRepository } from "../../../src/data-access/in-memory-user-provisioning-repository.js";
import { createUserTestDeps } from "../../../src/test-support/create-user-test-deps.js";
import { createMasterDataModuleCatalogPortStub } from "../../../src/test-support/master-data-catalog-port-stub.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../../../src/data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../../../src/data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../../../src/data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../../../src/data-access/in-memory-user-access-repository.js";
import { InMemoryUserRepository } from "../../../src/data-access/in-memory-user-repository.js";
import type {
  AuthAccountProvisioner,
  CreatePasswordAuthAccountInput,
  CreatePasswordAuthAccountResult,
  CreateUserInput,
  Capability,
} from "../../../src/ports/index.js";
import { createUser } from "../../../src/use-cases/create-user.js";

class TestEventBus implements EventBus {
  readonly published: DomainEvent[] = [];
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }
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

const entitlementPorts = {
  tenantModuleEntitlementPort: {
    async listTenantEnabledModuleIds(): Promise<string[]> {
      return [];
    },
  },
  masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub(),
} as const;

describe("createUser", () => {
  it("rejects non-string full_name", async () => {
    await expect(
      createUser(
        createUserTestDeps({
          eventBus: new TestEventBus(),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
        }),
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
        createUserTestDeps({
          eventBus: new TestEventBus(),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
        }),
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
          capability_key: "users:users:create",
          module: "users",
          feature: "users",
          action: "create",
          display_name: "Create users",
          description: null,
          is_active: true,
          source_catalog: "master_data",
          source_module_slug: "users",
          source_permission_slug: "create",
        },
      },
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
          capability_key: "users:users:read",
          module: "users",
          feature: "users",
          action: "read",
          display_name: "Read users",
          description: null,
          is_active: true,
          source_catalog: "master_data",
          source_module_slug: "users",
          source_permission_slug: "read",
        },
      },
      {
        capability: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d612",
          capability_key: "user-roles:role:assign",
          module: "user-roles",
          feature: "roles",
          action: "assign",
          display_name: "Assign roles",
          description: null,
          is_active: true,
          source_catalog: "master_data",
          source_module_slug: "user-roles",
          source_permission_slug: "assign",
        },
      },
    ]);
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
          code: "registrar",
          role_type: "registrar",
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
          role_type: "auditor",
          display_name: "Auditor",
          status: "active",
          is_system: false,
        },
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    const userProvisioningRepository = new InMemoryUserProvisioningRepository(
      userRepository,
      userAccessRepository,
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
        userProvisioningRepository,
        capabilityRepository,
        roleRepository,
        roleCapabilityRepository,
        principalRoleProjectionRepository,
        authAccountProvisioner,
        eventBus: new TestEventBus(),
        ...entitlementPorts,
      },
      {
        tenantId: "tenant-a",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d613",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d614",
      },
      {
        full_name: "New User",
        username: "new.user",
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
        username: "new.user",
        password: "password123",
      }),
    );
    expect(created.recovery_tier).toBe("standard");
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

  it("applies only selected role capabilities when role_template_capability_ids is set", async () => {
    const capCreate: Capability = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d610",
      capability_key: "users:users:create",
      module: "users",
      feature: "users",
      action: "create",
      display_name: "Create users",
      description: null,
      is_active: true,
      source_catalog: "master_data",
      source_module_slug: "users",
      source_permission_slug: "create",
    };
    const capRead: Capability = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
      capability_key: "users:users:read",
      module: "users",
      feature: "users",
      action: "read",
      display_name: "Read users",
      description: null,
      is_active: true,
      source_catalog: "master_data",
      source_module_slug: "users",
      source_permission_slug: "read",
    };
    const userRepository = new InMemoryUserRepository();
    const capabilityRepository = new InMemoryCapabilityRepository([
      { capability: capCreate },
      { capability: capRead },
    ]);
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
          code: "registrar",
          role_type: "registrar",
          display_name: "Registrar",
          status: "active",
          is_system: false,
        },
      },
    ]);
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    const userProvisioningRepository = new InMemoryUserProvisioningRepository(
      userRepository,
      userAccessRepository,
    );
    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([
      {
        tenantId: "tenant-a",
        roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d621",
        capabilities: [capCreate, capRead],
      },
    ]);
    const principalRoleProjectionRepository = new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository,
      roleRepository,
    );

    const created = await createUser(
      {
        userRepository,
        userProvisioningRepository,
        capabilityRepository,
        roleRepository,
        roleCapabilityRepository,
        principalRoleProjectionRepository,
        authAccountProvisioner: new AuthAccountProvisionerStub(),
        eventBus: new TestEventBus(),
        ...entitlementPorts,
      },
      {
        tenantId: "tenant-a",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d613",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d614",
      },
      {
        full_name: "Subset User",
        username: "subset.user",
        email: "subset.user@example.com",
        password: "password123",
        role_template_ids: ["f47ac10b-58cc-4372-a567-0e02b2c3d621"],
        role_template_capability_ids: ["f47ac10b-58cc-4372-a567-0e02b2c3d611"],
      },
    );

    const grants = await userAccessRepository.listActiveCapabilityGrantsByUser("tenant-a", created.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      capability_id: "f47ac10b-58cc-4372-a567-0e02b2c3d611",
      grant_source: "role_template",
    });
  });

  it("fails closed before user insert when direct capability entitlement lookup fails", async () => {
    const capId = "f47ac10b-58cc-4372-a567-0e02b2c3d610";
    const userRepository = new InMemoryUserRepository();
    const capabilityRepository = new InMemoryCapabilityRepository([
      {
        capability: {
          id: capId,
          capability_key: "users:users:create",
          module: "users",
          feature: "users",
          action: "create",
          display_name: "Create users",
          description: null,
          is_active: true,
          source_catalog: "master_data",
          source_module_slug: "users",
          source_permission_slug: "create",
        },
      },
    ]);

    const eventBus = new TestEventBus();
    const deps = createUserTestDeps({
      userRepository,
      eventBus,
      authAccountProvisioner: new AuthAccountProvisionerStub(),
      tenantModuleEntitlementPort: {
            listTenantEnabledModuleIds: vi
              .fn()
              .mockRejectedValue(new ModuleEntitlementLookupError("configurator")),
          },
      masterDataModuleCatalogPort: createMasterDataModuleCatalogPortStub({
        resolveModuleSlugsByIds: vi.fn(),
      }),
    });
    deps.capabilityRepository = capabilityRepository;

    await expect(
      createUser(
        deps,
        { tenantId: "tenant-a", actorId: "a1", correlationId: "c1" },
        {
          full_name: "X",
          username: "x.user",
          email: "x@example.com",
          password: "password123",
          capability_ids: [capId],
        },
      ),
    ).rejects.toBeInstanceOf(ModuleEntitlementLookupError);

    await expect(userRepository.listUsers("tenant-a")).resolves.toHaveLength(0);
    expect(eventBus.published).toHaveLength(0);
  });

  it("rolls back user and grants when transactional provisioning fails", async () => {
    const userRepository = new InMemoryUserRepository();
    const roleRepository = new InMemoryRoleRepository();
    const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
      roleRepository.getRoleById(tenantId, roleId),
    );
    const eventBus = new TestEventBus();

    const deps = createUserTestDeps({
      userRepository,
      eventBus,
      authAccountProvisioner: new AuthAccountProvisionerStub(),
    });
    deps.userProvisioningRepository = {
      async provisionUserWithAccess() {
        throw new UnexpectedPersistenceError();
      },
    };

    await expect(
      createUser(deps, { tenantId: "tenant-a", actorId: "a1", correlationId: "c1" }, {
        full_name: "Rollback User",
        username: "rollback.user",
        email: "rollback@example.com",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(UnexpectedPersistenceError);

    await expect(userRepository.listUsers("tenant-a")).resolves.toHaveLength(0);
    expect(eventBus.published).toHaveLength(0);
  });

  it("rolls back user when role template entitlement validation fails", async () => {
    const capBilling: Capability = {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d630",
      capability_key: "billing:invoice:read",
      module: "billing",
      feature: "invoice",
      action: "read",
      display_name: "Read invoices",
      description: null,
      is_active: true,
    };
    const userRepository = new InMemoryUserRepository();
    const capabilityRepository = new InMemoryCapabilityRepository([{ capability: capBilling }]);
    const roleRepository = new InMemoryRoleRepository([
      {
        tenantId: "tenant-a",
        role: {
          id: "f47ac10b-58cc-4372-a567-0e02b2c3d631",
          code: "billing-clerk",
          role_type: "billing-clerk",
          display_name: "Billing clerk",
          status: "active",
          is_system: false,
        },
      },
    ]);
    const roleCapabilityRepository = new InMemoryRoleCapabilityRepository([
      {
        tenantId: "tenant-a",
        roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d631",
        capabilities: [capBilling],
      },
    ]);
    const eventBus = new TestEventBus();

    const deps = createUserTestDeps({
      userRepository,
      eventBus,
      authAccountProvisioner: new AuthAccountProvisionerStub(),
    });
    deps.capabilityRepository = capabilityRepository;
    deps.roleRepository = roleRepository;
    deps.roleCapabilityRepository = roleCapabilityRepository;

    await expect(
      createUser(deps, { tenantId: "tenant-a", actorId: "a1", correlationId: "c1" }, {
        full_name: "Role Fail",
        username: "role.fail",
        email: "role.fail@example.com",
        password: "password123",
        role_template_ids: ["f47ac10b-58cc-4372-a567-0e02b2c3d631"],
      }),
    ).rejects.toMatchObject({ code: "CAPABILITY_NOT_ENTITLED_FOR_TENANT" });

    await expect(userRepository.listUsers("tenant-a")).resolves.toHaveLength(0);
    expect(eventBus.published).toHaveLength(0);
  });

  // --- Username-primary flip (authn spec §2 / §3.2). These deliberately use no capability_ids /
  //     role_template_ids so they exercise the real provisioner + provisioning repo WITHOUT the
  //     (pre-existing, separately-tracked) capability-key fixture rot that blocks the grant tests. ---

  it("requires a username (username-primary login)", async () => {
    await expect(
      createUser(
        createUserTestDeps({
          eventBus: new TestEventBus(),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
        }),
        { tenantId: "t1", actorId: "a1", correlationId: "c1" },
        { full_name: "No Username", password: "password123" } as unknown as CreateUserInput,
      ),
    ).rejects.toMatchObject({ issue: "username_required" });
  });

  it("rejects an invalid username charset (no hyphen — matches better-auth's validator)", async () => {
    await expect(
      createUser(
        createUserTestDeps({
          eventBus: new TestEventBus(),
          authAccountProvisioner: new AuthAccountProvisionerStub(),
        }),
        { tenantId: "t1", actorId: "a1", correlationId: "c1" },
        { full_name: "Bad Handle", username: "bad-user!", password: "password123" },
      ),
    ).rejects.toMatchObject({ issue: "username_invalid" });
  });

  it("passes username (not email) to the provisioner and derives recovery_tier=standard when an email is given", async () => {
    const provisioner = new AuthAccountProvisionerStub();
    const userRepository = new InMemoryUserRepository();
    const tenantId = "f47ac10b-58cc-4372-a567-0e02b2c3d700";
    const created = await createUser(
      createUserTestDeps({
        userRepository,
        eventBus: new TestEventBus(),
        authAccountProvisioner: provisioner,
      }),
      {
        tenantId,
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d701",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d702",
      },
      { full_name: "Carol Lee", username: "Carol.Lee", email: "carol@example.com", password: "password123" },
    );

    const call = provisioner.createPasswordAccount.mock.calls[0]?.[0];
    expect(call).toMatchObject({ username: "carol.lee", tenantId, fullName: "Carol Lee" });
    // Synthetic email is derived inside the better-auth boundary, never passed through this port.
    expect(call).not.toHaveProperty("email");
    expect(created.username).toBe("carol.lee");
    expect(created.email).toBe("carol@example.com");
    expect(created.recovery_tier).toBe("standard");
  });

  it("derives recovery_tier=admin_only and null email when no email is supplied", async () => {
    const provisioner = new AuthAccountProvisionerStub();
    const created = await createUser(
      createUserTestDeps({
        eventBus: new TestEventBus(),
        authAccountProvisioner: provisioner,
      }),
      {
        tenantId: "f47ac10b-58cc-4372-a567-0e02b2c3d700",
        actorId: "f47ac10b-58cc-4372-a567-0e02b2c3d701",
        correlationId: "f47ac10b-58cc-4372-a567-0e02b2c3d702",
      },
      { full_name: "Dan Ray", username: "dan.ray", password: "password123" },
    );

    expect(provisioner.createPasswordAccount.mock.calls[0]?.[0]).toMatchObject({ username: "dan.ray" });
    expect(created.email).toBeNull();
    expect(created.recovery_tier).toBe("admin_only");
  });
});

import type { EventBus } from "@hims/ts-sdk-events";
import { InMemoryCapabilityRepository } from "../data-access/in-memory-capability-repository.js";
import { InMemoryPrincipalRoleProjectionRepository } from "../data-access/in-memory-principal-role-projection-repository.js";
import { InMemoryRoleCapabilityRepository } from "../data-access/in-memory-role-capability-repository.js";
import { InMemoryRoleRepository } from "../data-access/in-memory-role-repository.js";
import { InMemoryUserAccessRepository } from "../data-access/in-memory-user-access-repository.js";
import { InMemoryUserProvisioningRepository } from "../data-access/in-memory-user-provisioning-repository.js";
import { InMemoryUserRepository } from "../data-access/in-memory-user-repository.js";
import type { CreateUserDeps } from "../use-cases/create-user.js";
import type {
  AuthAccountProvisioner,
  MasterDataModuleCatalogPort,
  TenantModuleEntitlementPort,
} from "../ports/index.js";

export type CreateUserTestDepsOptions = {
  userRepository?: InMemoryUserRepository;
  tenantModuleEntitlementPort?: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort?: MasterDataModuleCatalogPort;
  authAccountProvisioner?: AuthAccountProvisioner;
  eventBus: EventBus;
};

export function createUserTestDeps(options: CreateUserTestDepsOptions): CreateUserDeps {
  const userRepository = options.userRepository ?? new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const userAccessRepository = new InMemoryUserAccessRepository((tenantId, roleId) =>
    roleRepository.getRoleById(tenantId, roleId),
  );

  return {
    userRepository,
    userProvisioningRepository: new InMemoryUserProvisioningRepository(
      userRepository,
      userAccessRepository,
    ),
    capabilityRepository: new InMemoryCapabilityRepository(),
    roleRepository,
    roleCapabilityRepository: new InMemoryRoleCapabilityRepository(),
    userAccessRepository,
    principalRoleProjectionRepository: new InMemoryPrincipalRoleProjectionRepository(
      userAccessRepository,
      roleRepository,
    ),
    authAccountProvisioner:
      options.authAccountProvisioner ?? {
        async createPasswordAccount(input) {
          return { authUserId: input.platformUserId };
        },
      },
    eventBus: options.eventBus,
    tenantModuleEntitlementPort:
      options.tenantModuleEntitlementPort ?? {
        async listTenantEnabledModuleIds() {
          return [];
        },
      },
    masterDataModuleCatalogPort:
      options.masterDataModuleCatalogPort ?? {
        async resolveModuleSlugsByIds() {
          return new Map();
        },
      },
  };
}

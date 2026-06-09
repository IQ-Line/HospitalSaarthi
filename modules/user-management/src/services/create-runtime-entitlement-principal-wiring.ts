import type {
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  PrincipalAuthorizationRepository,
  PrincipalRoleProjectionRepository,
  TenantModuleEntitlementPort,
  UserRepository,
} from "../ports/index.js";
import {
  CachedTenantEntitlementResolver,
  isRuntimeEntitlementIntersectionEnabled,
} from "./cached-tenant-entitlement-resolver.js";
import {
  createDefaultPrincipalService,
  type DefaultPrincipalService,
} from "./default-principal-service.js";

export type CreateRuntimeEntitlementPrincipalWiringInput = {
  userRepository: UserRepository;
  principalRoleProjectionRepository: PrincipalRoleProjectionRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
  capabilityRepository: CapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort & {
    invalidateTenantModuleCache?(tenantId?: string): void;
  };
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
  log?: (event: Record<string, unknown>, message: string) => void;
  runtimeEntitlementIntersection?: boolean;
};

export type RuntimeEntitlementPrincipalWiring = {
  tenantEntitlementResolver: CachedTenantEntitlementResolver;
  principalService: DefaultPrincipalService;
};

/**
 * Wires cached tenant entitlement resolution into {@link DefaultPrincipalService}.
 * Used by all PEP services (user-management, billing, registration).
 */
export function createRuntimeEntitlementPrincipalWiring(
  input: CreateRuntimeEntitlementPrincipalWiringInput,
): RuntimeEntitlementPrincipalWiring {
  const tenantEntitlementResolver = new CachedTenantEntitlementResolver({
    deps: {
      capabilityRepository: input.capabilityRepository,
      tenantModuleEntitlementPort: input.tenantModuleEntitlementPort,
      masterDataModuleCatalogPort: input.masterDataModuleCatalogPort,
    },
    log: input.log,
    onInvalidateTenant: (tenantId) =>
      input.tenantModuleEntitlementPort.invalidateTenantModuleCache?.(tenantId),
  });

  const intersectionEnabled =
    input.runtimeEntitlementIntersection ?? isRuntimeEntitlementIntersectionEnabled();

  const principalService = createDefaultPrincipalService({
    userRepository: input.userRepository,
    principalRoleProjectionRepository: input.principalRoleProjectionRepository,
    principalAuthorizationRepository: input.principalAuthorizationRepository,
    tenantEntitlementResolver,
    runtimeEntitlementIntersection: intersectionEnabled,
    logEntitlementIntersection: input.log,
  });

  return { tenantEntitlementResolver, principalService };
}

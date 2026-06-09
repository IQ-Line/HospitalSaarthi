import type {
  ModuleEntitlementRequestContext,
  PrincipalAuthorizationRepository,
  TenantEntitlementResolverPort,
  UserEffectiveCapabilities,
  UserRepository,
} from "../ports/index.js";
import { UserNotFoundError } from "../domain/errors.js";
import { effectiveUmClearanceTierFromClearances } from "../domain/um-clearance-tier.js";
import {
  computeEffectivePrincipalCapabilities,
  computeStoredPrincipalCapabilities,
} from "./compute-effective-principal-capabilities.js";

export type GetUserEffectiveCapabilitiesDeps = {
  userRepository: UserRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
  tenantEntitlementResolver?: TenantEntitlementResolverPort;
  runtimeEntitlementIntersection?: boolean;
};

export async function getUserEffectiveCapabilities(
  deps: GetUserEffectiveCapabilitiesDeps,
  tenantId: string,
  userId: string,
  context?: ModuleEntitlementRequestContext,
): Promise<UserEffectiveCapabilities> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  const [storedDirectKeys, delegatedCapabilityKeys, clearances] = await Promise.all([
    deps.principalAuthorizationRepository.listEffectiveCapabilityKeys(tenantId, userId),
    deps.principalAuthorizationRepository.listDelegatedCapabilityKeys(tenantId, userId),
    deps.principalAuthorizationRepository.getClearanceLevels(tenantId, userId),
  ]);

  const intersectionEnabled =
    deps.tenantEntitlementResolver !== undefined &&
    (deps.runtimeEntitlementIntersection ?? true);

  let capability_keys: string[];
  let delegated_keys: string[];

  if (intersectionEnabled && deps.tenantEntitlementResolver !== undefined) {
    const entitlement = await deps.tenantEntitlementResolver.resolveTenantEntitlement(
      tenantId,
      context,
    );
    const effective = computeEffectivePrincipalCapabilities(
      storedDirectKeys,
      delegatedCapabilityKeys,
      entitlement.entitledCapabilityKeys,
    );
    capability_keys = effective.capabilities;
    delegated_keys = effective.delegated_capabilities;
  } else {
    const stored = computeStoredPrincipalCapabilities(storedDirectKeys, delegatedCapabilityKeys);
    capability_keys = stored.capabilities;
    delegated_keys = stored.delegated_capabilities;
  }

  return {
    capability_keys,
    delegated_capability_keys: delegated_keys,
    clearances,
    um_clearance_effective_tier: effectiveUmClearanceTierFromClearances(clearances),
  };
}

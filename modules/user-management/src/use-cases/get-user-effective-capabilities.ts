import { UserNotFoundError } from "../domain/errors.js";
import { effectiveUmClearanceTierFromClearances } from "../domain/um-clearance-tier.js";
import type {
  PrincipalAuthorizationRepository,
  UserEffectiveCapabilities,
  UserRepository,
} from "../ports/index.js";

export type GetUserEffectiveCapabilitiesDeps = {
  userRepository: UserRepository;
  principalAuthorizationRepository: PrincipalAuthorizationRepository;
};

export async function getUserEffectiveCapabilities(
  deps: GetUserEffectiveCapabilitiesDeps,
  tenantId: string,
  userId: string,
): Promise<UserEffectiveCapabilities> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  const [capabilityKeys, delegatedCapabilityKeys, clearances] = await Promise.all([
    deps.principalAuthorizationRepository.listEffectiveCapabilityKeys(tenantId, userId),
    deps.principalAuthorizationRepository.listDelegatedCapabilityKeys(tenantId, userId),
    deps.principalAuthorizationRepository.getClearanceLevels(tenantId, userId),
  ]);

  return {
    capability_keys: capabilityKeys,
    delegated_capability_keys: delegatedCapabilityKeys,
    clearances,
    um_clearance_effective_tier: effectiveUmClearanceTierFromClearances(clearances),
  };
}

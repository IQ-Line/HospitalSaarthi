import { intersectCapabilityKeys } from "../domain/intersect-capability-keys.js";
import { canonicalizeRuntimeCapabilityKeys } from "../domain/legacy-capability-key-remap.js";

export type EffectivePrincipalCapabilities = {
  capabilities: string[];
  delegated_capabilities: string[];
};

/**
 * Applies tenant entitlement intersection to stored grant keys.
 * When `entitledKeys` is empty, returns empty effective sets (fail-safe narrow).
 */
export function computeEffectivePrincipalCapabilities(
  storedDirectKeys: readonly string[],
  storedDelegatedKeys: readonly string[],
  entitledKeys: ReadonlySet<string>,
): EffectivePrincipalCapabilities {
  if (entitledKeys.size === 0) {
    return { capabilities: [], delegated_capabilities: [] };
  }

  return {
    capabilities: intersectCapabilityKeys(storedDirectKeys, entitledKeys),
    delegated_capabilities: intersectCapabilityKeys(storedDelegatedKeys, entitledKeys),
  };
}

/** Stored-only path when entitlement intersection is disabled (feature flag rollback). */
export function computeStoredPrincipalCapabilities(
  storedDirectKeys: readonly string[],
  storedDelegatedKeys: readonly string[],
): EffectivePrincipalCapabilities {
  return {
    capabilities: canonicalizeRuntimeCapabilityKeys(storedDirectKeys),
    delegated_capabilities: canonicalizeRuntimeCapabilityKeys(storedDelegatedKeys),
  };
}

export type EntitlementIntersectionMetrics = {
  storedDirectCount: number;
  storedDelegatedCount: number;
  effectiveDirectCount: number;
  effectiveDelegatedCount: number;
  filteredDirectCount: number;
  filteredDelegatedCount: number;
};

export function entitlementIntersectionMetrics(
  storedDirectKeys: readonly string[],
  storedDelegatedKeys: readonly string[],
  effective: EffectivePrincipalCapabilities,
): EntitlementIntersectionMetrics {
  const storedDirectCount = storedDirectKeys.filter((k) => k.trim().length > 0).length;
  const storedDelegatedCount = storedDelegatedKeys.filter((k) => k.trim().length > 0).length;
  const effectiveDirectCount = effective.capabilities.length;
  const effectiveDelegatedCount = effective.delegated_capabilities.length;
  return {
    storedDirectCount,
    storedDelegatedCount,
    effectiveDirectCount,
    effectiveDelegatedCount,
    filteredDirectCount: Math.max(0, storedDirectCount - effectiveDirectCount),
    filteredDelegatedCount: Math.max(0, storedDelegatedCount - effectiveDelegatedCount),
  };
}

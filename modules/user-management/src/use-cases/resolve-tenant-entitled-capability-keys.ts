import { normalizeRuntimeCapabilityKeys } from "../domain/capability-key.js";
import type { TenantEntitlementResolution } from "../ports/module-integration-ports.js";
import type { ModuleEntitlementRequestContext } from "../ports/index.js";
import {
  listAssignableRuntimeCapabilities,
  type ListAssignableRuntimeCapabilitiesDeps,
} from "./list-assignable-runtime-capabilities.js";

export type { TenantEntitlementResolution } from "../ports/module-integration-ports.js";

function fingerprintEntitledKeys(keys: readonly string[]): string {
  return keys.join("\u001e");
}

/**
 * Resolves tenant entitlement as canonical capability keys (same set as assignable catalog).
 * Fail-closed: propagates `ModuleEntitlementLookupError` when upstream is unavailable.
 */
export async function resolveTenantEntitledCapabilityKeys(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  tenantId: string,
  context?: ModuleEntitlementRequestContext,
): Promise<TenantEntitlementResolution> {
  const assignable = await listAssignableRuntimeCapabilities(deps, tenantId, context);
  const rawKeys = assignable.map((capability) => capability.capability_key);
  const entitledCapabilityKeys = new Set(normalizeRuntimeCapabilityKeys(rawKeys));
  const sortedKeys = [...entitledCapabilityKeys].sort((a, b) => a.localeCompare(b));
  return {
    entitledCapabilityKeys,
    tenantEntitlementRevision: fingerprintEntitledKeys(sortedKeys),
  };
}

import { CapabilityNotEntitledForTenantError } from "../domain/errors.js";
import type { ModuleEntitlementRequestContext } from "../ports/index.js";
import {
  listAssignableRuntimeCapabilities,
  type ListAssignableRuntimeCapabilitiesDeps,
} from "./list-assignable-runtime-capabilities.js";

/**
 * Ensures every capability id is in the tenant's assignable runtime capability set.
 * Fail closed when Configurator or Master Data is unavailable.
 */
export async function assertRuntimeCapabilitiesEntitledForTenant(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  tenantId: string,
  capabilityIds: string[],
  context?: ModuleEntitlementRequestContext,
): Promise<void> {
  if (capabilityIds.length === 0) {
    return;
  }

  const assignable = await listAssignableRuntimeCapabilities(deps, tenantId, context);
  const assignableIds = new Set(assignable.map((capability) => capability.id));
  const rejected = capabilityIds.find((capabilityId) => !assignableIds.has(capabilityId));
  if (rejected !== undefined) {
    throw new CapabilityNotEntitledForTenantError(rejected);
  }
}

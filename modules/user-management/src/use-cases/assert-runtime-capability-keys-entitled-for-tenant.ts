import { CapabilityNotFoundError } from "../domain/errors.js";
import { normalizeCapabilityKey } from "../domain/capability-key.js";
import type { CapabilityRepository, ModuleEntitlementRequestContext } from "../ports/index.js";
import type { ListAssignableRuntimeCapabilitiesDeps } from "./list-assignable-runtime-capabilities.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";

export type AssertRuntimeCapabilityKeysEntitledDeps = ListAssignableRuntimeCapabilitiesDeps & {
  capabilityRepository: CapabilityRepository;
};

/**
 * Resolves capability keys to catalog ids and ensures each is assignable for the tenant.
 */
export async function assertRuntimeCapabilityKeysEntitledForTenant(
  deps: AssertRuntimeCapabilityKeysEntitledDeps,
  tenantId: string,
  capabilityKeys: string[],
  context?: ModuleEntitlementRequestContext,
): Promise<string[]> {
  const normalizedKeys = [
    ...new Set(capabilityKeys.map((key) => normalizeCapabilityKey(key)).filter((key) => key.length > 0)),
  ];

  if (normalizedKeys.length === 0) {
    return [];
  }

  const capabilities = await deps.capabilityRepository.listCapabilitiesByKeys(normalizedKeys);
  if (capabilities.length !== normalizedKeys.length) {
    const found = new Set(capabilities.map((row) => row.capability_key));
    const missing = normalizedKeys.find((key) => !found.has(key));
    throw new CapabilityNotFoundError(missing);
  }

  const capabilityIds = capabilities.map((row) => row.id);
  await assertRuntimeCapabilitiesEntitledForTenant(deps, tenantId, capabilityIds, context);
  return capabilityIds;
}

import { normalizeCapabilityKey } from "../domain/capability-key.js";
import { CapabilityNotFoundError } from "../domain/errors.js";
import { assertPartnerOrchestrationCapabilityKeyAllowlist } from "../domain/partner-orchestration-capability-keys.js";
import type { CapabilityRepository } from "../ports/index.js";

export type AssertPartnerOrchestrationCapabilityKeysDeps = {
  capabilityRepository: CapabilityRepository;
};

/**
 * Resolves partner capability keys to catalog ids.
 * Skips tenant module entitlement — orchestration allowlist + active catalog rows only (ADR-0032).
 */
export async function assertPartnerOrchestrationCapabilityKeys(
  deps: AssertPartnerOrchestrationCapabilityKeysDeps,
  capabilityKeys: string[],
): Promise<string[]> {
  const normalizedKeys = [
    ...new Set(capabilityKeys.map((key) => normalizeCapabilityKey(key)).filter((key) => key.length > 0)),
  ];

  if (normalizedKeys.length === 0) {
    return [];
  }

  assertPartnerOrchestrationCapabilityKeyAllowlist(normalizedKeys);

  const capabilities = await deps.capabilityRepository.listCapabilitiesByKeys(normalizedKeys);
  if (capabilities.length !== normalizedKeys.length) {
    const found = new Set(capabilities.map((row) => row.capability_key));
    const missing = normalizedKeys.find((key) => !found.has(key));
    throw new CapabilityNotFoundError(missing);
  }

  const inactive = capabilities.find((row) => !row.is_active);
  if (inactive !== undefined) {
    throw new CapabilityNotFoundError(inactive.capability_key);
  }

  return capabilities.map((row) => row.id);
}

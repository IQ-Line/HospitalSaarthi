import { normalizeCapabilityKey } from "./capability-key.js";
import { UserManagementError } from "./errors.js";

/**
 * Runtime capability keys grantable to partner principals via Integration Hub activate.
 * Must stay aligned with partner-exposed inbound operations (ADR-0032) and `0006_integration_capabilities_seed.sql`.
 * Human admin assignment still uses tenant module entitlement; orchestration validates catalog + allowlist only.
 */
export const PARTNER_ORCHESTRATION_CAPABILITY_KEYS = [
  "registration:registration:read",
  "empi:patient:read",
] as const;

const ALLOWED_KEY_SET = new Set<string>(
  PARTNER_ORCHESTRATION_CAPABILITY_KEYS.map((key) => normalizeCapabilityKey(key)),
);

export function isPartnerOrchestrationCapabilityKey(key: string): boolean {
  return ALLOWED_KEY_SET.has(normalizeCapabilityKey(key));
}

export function assertPartnerOrchestrationCapabilityKeyAllowlist(keys: readonly string[]): void {
  const unknown = keys.filter((key) => !isPartnerOrchestrationCapabilityKey(key));
  if (unknown.length > 0) {
    throw new PartnerOrchestrationCapabilityKeyError(unknown);
  }
}

export class PartnerOrchestrationCapabilityKeyError extends UserManagementError {
  constructor(readonly keys: string[]) {
    super(
      "PARTNER_CAPABILITY_KEY_NOT_ALLOWED",
      `Capability keys are not allowed for partner orchestration: ${keys.join(", ")}`,
    );
    this.name = "PartnerOrchestrationCapabilityKeyError";
  }
}

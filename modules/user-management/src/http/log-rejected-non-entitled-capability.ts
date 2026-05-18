import type { FastifyBaseLogger } from "fastify";
import { CapabilityNotEntitledForTenantError } from "../domain/errors.js";

/**
 * Single structured log line when a write is rejected because a capability is outside the
 * tenant assignable runtime set. Avoids per-capability log noise (one id is enough for triage).
 */
export function logRejectedNonEntitledCapabilityId(
  log: FastifyBaseLogger,
  tenantId: string,
  err: unknown,
): void {
  if (err instanceof CapabilityNotEntitledForTenantError) {
    log.warn(
      {
        tenantId,
        capabilityId: err.capabilityId,
        reason: "capability_not_entitled_for_tenant",
      },
      "Rejected non-entitled runtime capability assignment",
    );
  }
}

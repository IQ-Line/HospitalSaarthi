import type { NhaBridgeService } from "../../domain/bridge-services.js";

const ELIGIBLE_SERVICE_TYPES = new Set(["HIP", "HIU"]);

/** Replicates old abdi-lims-backed tenantFacilityHelper eligibility filter. */
export function filterEligibleBridgeServiceIds(services: NhaBridgeService[]): string[] {
  return services
    .filter((s) => s.types.every((t) => ELIGIBLE_SERVICE_TYPES.has(t)))
    .map((s) => s.id);
}

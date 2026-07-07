import type { IntegrationProfileRepo } from "../../../../lib/integration-profile-repo.js";
import type { GatewayClient } from "../../ports.js";
import { filterEligibleBridgeServiceIds } from "./filter-eligible-bridge-service-ids.js";
import { findBridgeServices } from "./find-bridge-services.js";

export async function getMappedFacilityIds(deps: {
  gateway: GatewayClient;
  profiles: IntegrationProfileRepo;
}): Promise<string[]> {
  const bridge = await findBridgeServices({ gateway: deps.gateway });
  const eligible = new Set(filterEligibleBridgeServiceIds(bridge.services ?? []));
  const configured = await deps.profiles.findAllActiveAbdm();
  return configured
    .filter((p) => eligible.has(p.hipId))
    .map((p) => p.hipId);
}

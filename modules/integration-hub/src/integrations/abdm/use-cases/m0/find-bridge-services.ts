import type { GatewayClient } from "../../ports.js";
import type { NhaBridgeServicesResponse } from "../../domain/bridge-services.js";

const BRIDGE_SERVICES_PATH = "/api/hiecm/gateway/v3/bridge-services";

export async function findBridgeServices(deps: {
  gateway: GatewayClient;
}): Promise<NhaBridgeServicesResponse> {
  return deps.gateway.get<NhaBridgeServicesResponse>({
    path: BRIDGE_SERVICES_PATH,
    target: "gateway",
  });
}

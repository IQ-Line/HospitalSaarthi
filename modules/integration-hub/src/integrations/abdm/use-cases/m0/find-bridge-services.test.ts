import { describe, expect, it, vi } from "vitest";
import { findBridgeServices } from "./find-bridge-services.js";
import type { GatewayClient } from "../../ports.js";

describe("findBridgeServices", () => {
  it("calls gateway GET on bridge-services with gateway target", async () => {
    const bridgeResponse = {
      bridge: { id: "SBX_1" },
      services: [{ id: "IN1", types: ["HIP", "HIU"] }],
    };
    const gateway: GatewayClient = {
      get: vi.fn().mockResolvedValue(bridgeResponse),
      post: vi.fn(),
      getPublicCertificate: vi.fn(),
      invalidateBearer: vi.fn(),
      getDiagnosticsSnapshot: vi.fn(),
    };

    const result = await findBridgeServices({ gateway });

    expect(result).toEqual(bridgeResponse);
    expect(gateway.get).toHaveBeenCalledWith({
      path: "/api/hiecm/gateway/v3/bridge-services",
      target: "gateway",
    });
  });
});

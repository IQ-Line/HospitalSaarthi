import { describe, expect, it } from "vitest";
import {
  INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS,
  INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES,
  isBridgeDiscoveryPath,
} from "./integration-hub-identity-skip-paths.js";

describe("INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES", () => {
  it("includes M0 bridge discovery routes without JWT", () => {
    expect(INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS).toContain(
      "/api/abdm/v1/m0/bridge-services",
    );
    expect(INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS).toContain(
      "/api/abdm/v1/tenant/mapped-facility-ids",
    );
  });

  it("includes health probe paths without JWT", () => {
    expect(INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES).toContain("/healthz");
    expect(INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES).toContain("/api/abdm/v1/healthz");
  });
});

describe("isBridgeDiscoveryPath", () => {
  it("matches discovery routes only", () => {
    expect(isBridgeDiscoveryPath("/api/abdm/v1/m0/bridge-services")).toBe(true);
    expect(isBridgeDiscoveryPath("/api/abdm/v1/tenant/mapped-facility-ids")).toBe(true);
    expect(isBridgeDiscoveryPath("/api/abdm/v1/m1/enrol/aadhaar/otp")).toBe(false);
  });
});

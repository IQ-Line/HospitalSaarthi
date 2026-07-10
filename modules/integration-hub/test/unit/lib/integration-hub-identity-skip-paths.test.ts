import { describe, expect, it } from "vitest";
import {
  INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS,
  INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES,
  isBridgeDiscoveryPath,
} from "../../../src/lib/integration-hub-identity-skip-paths.js";

describe("INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES", () => {
  it("skips only health probe paths without JWT", () => {
    expect([...INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES]).toEqual([
      "/healthz",
      "/api/abdm/v1/healthz",
    ]);
  });

  it("does NOT skip bridge-discovery routes (they now require a verified token)", () => {
    for (const p of INTEGRATION_HUB_BRIDGE_DISCOVERY_PATHS) {
      expect(INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES as readonly string[]).not.toContain(p);
    }
  });

  it("does NOT skip any platform-facing surface", () => {
    const platformSamples = [
      "/api/abdm/v1/m1/enrol/aadhaar/otp",
      "/api/abdm/v1/m2/link-token/acquire",
      "/api/abdm/v1/m3/hiu/consent/request",
      "/api/abdm/v1/scan-share/status",
      "/api/abdm/v1/m0/bridge-services",
      "/api/abdm/v1/tenant/mapped-facility-ids",
    ];
    for (const path of platformSamples) {
      expect(INTEGRATION_HUB_IDENTITY_SKIP_PATH_PREFIXES as readonly string[]).not.toContain(path);
    }
  });
});

describe("isBridgeDiscoveryPath", () => {
  it("matches discovery routes only, and strips the query string", () => {
    expect(isBridgeDiscoveryPath("/api/abdm/v1/m0/bridge-services")).toBe(true);
    expect(isBridgeDiscoveryPath("/api/abdm/v1/tenant/mapped-facility-ids?x=1")).toBe(true);
    expect(isBridgeDiscoveryPath("/api/abdm/v1/m1/enrol/aadhaar/otp")).toBe(false);
    // Segment-boundary safety: a lookalike suffix is not a discovery path.
    expect(isBridgeDiscoveryPath("/api/abdm/v1/m0/bridge-services-evil")).toBe(false);
  });
});

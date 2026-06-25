import { describe, expect, it } from "vitest";
import { filterEligibleBridgeServiceIds } from "./filter-eligible-bridge-service-ids.js";
import type { NhaBridgeService } from "../../domain/bridge-services.js";

describe("filterEligibleBridgeServiceIds", () => {
  const services: NhaBridgeService[] = [
    { id: "IN-HIP-HIU", types: ["HIP", "HIU"] },
    { id: "IN-HIP-ONLY", types: ["HIP"] },
    { id: "IN-HIU-ONLY", types: ["HIU"] },
    { id: "IN-PHR", types: ["HIP", "PHR"] },
    { id: "IN-MIXED", types: ["HIP", "HIU", "OTHER"] },
  ];

  it("includes services whose types are only HIP and/or HIU", () => {
    expect(filterEligibleBridgeServiceIds(services)).toEqual([
      "IN-HIP-HIU",
      "IN-HIP-ONLY",
      "IN-HIU-ONLY",
    ]);
  });

  it("returns empty array when no services", () => {
    expect(filterEligibleBridgeServiceIds([])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { isLegacyCapabilityKey } from "../../../src/dev/legacy-capability-key-prefixes.js";

describe("isLegacyCapabilityKey", () => {
  it("matches abbreviated prefixes", () => {
    expect(isLegacyCapabilityKey("um:user:read")).toBe(true);
    expect(isLegacyCapabilityKey("md:visitpad:view")).toBe(true);
    expect(isLegacyCapabilityKey("cfg:shell:access")).toBe(true);
    expect(isLegacyCapabilityKey("fd:shell:access")).toBe(true);
  });

  it("does not match catalog slug keys", () => {
    expect(isLegacyCapabilityKey("users:users:read")).toBe(false);
    expect(isLegacyCapabilityKey("master-data:shell:access")).toBe(false);
  });
});

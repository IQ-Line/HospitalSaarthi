import { describe, expect, it } from "vitest";
import {
  canonicalizeRuntimeCapabilityKey,
  canonicalizeRuntimeCapabilityKeys,
  projectCapabilityRowToCanonical,
} from "../../../src/domain/legacy-capability-key-remap.js";

describe("legacy-capability-key-remap", () => {
  it("maps um:* keys to catalog slug keys", () => {
    expect(canonicalizeRuntimeCapabilityKey("  UM:User:Read ")).toBe("users:users:read");
    expect(canonicalizeRuntimeCapabilityKey("um:role:assign")).toBe("user-roles:role:assign");
  });

  it("maps L1 user-management product keys to L2 Cerbos vocabulary", () => {
    expect(canonicalizeRuntimeCapabilityKey("user-management:user:read")).toBe(
      "users:users:read",
    );
    expect(canonicalizeRuntimeCapabilityKey("user-management:role:assign")).toBe(
      "user-roles:role:assign",
    );
  });

  it("passes through canonical keys unchanged", () => {
    expect(canonicalizeRuntimeCapabilityKey("users:users:create")).toBe("users:users:create");
  });

  it("deduplicates legacy and canonical equivalents", () => {
    expect(
      canonicalizeRuntimeCapabilityKeys(["um:user:read", "users:users:read", "UM:ROLE:READ"]),
    ).toEqual(["user-roles:user-roles:read", "users:users:read"]);
  });

  it("projects legacy catalog rows for validation", () => {
    expect(
      projectCapabilityRowToCanonical({
        capability_key: "um:user:read",
        module: "user-management",
        feature: "users",
        action: "read",
      }),
    ).toEqual({
      capability_key: "users:users:read",
      module: "users",
      feature: "users",
      action: "read",
    });
  });
});

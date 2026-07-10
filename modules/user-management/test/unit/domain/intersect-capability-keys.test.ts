import { describe, expect, it } from "vitest";
import { intersectCapabilityKeys } from "../../../src/domain/intersect-capability-keys.js";

describe("intersectCapabilityKeys", () => {
  it("returns only stored keys present in entitlement set", () => {
    const entitled = new Set(["users:users:read", "opd:visits:read"]);
    expect(
      intersectCapabilityKeys(
        ["users:users:read", "billing:invoices:read", "opd:visits:read"],
        entitled,
      ),
    ).toEqual(["opd:visits:read", "users:users:read"]);
  });

  it("normalizes case and whitespace before intersection", () => {
    const entitled = new Set(["users:users:read"]);
    expect(intersectCapabilityKeys([" USERS:Users:READ "], entitled)).toEqual(["users:users:read"]);
  });

  it("returns empty when entitlement set is empty", () => {
    expect(intersectCapabilityKeys(["users:users:read"], new Set())).toEqual([]);
  });
});

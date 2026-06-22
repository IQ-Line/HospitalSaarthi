import { describe, expect, it } from "vitest";
import { normalizePharmacyQueueSearch, normalizePharmacyQueueStatus } from "../../../src/lib/pharmacy-queue-filter.js";

describe("pharmacy-queue-filter", () => {
  it("normalizes queue status filter", () => {
    expect(normalizePharmacyQueueStatus("pending")).toBe("pending");
    expect(normalizePharmacyQueueStatus("issued")).toBe("issued");
    expect(normalizePharmacyQueueStatus("all")).toBe("all");
    expect(normalizePharmacyQueueStatus(undefined)).toBe("all");
    expect(normalizePharmacyQueueStatus("invalid")).toBe("all");
  });

  it("normalizes search query", () => {
    expect(normalizePharmacyQueueSearch("  Dee  ")).toBe("dee");
    expect(normalizePharmacyQueueSearch(null)).toBe("");
  });
});

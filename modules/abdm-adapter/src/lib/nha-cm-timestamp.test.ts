import { describe, expect, it } from "vitest";
import {
  formatNhaCmTimestamp,
  normalizeConsentPermissionDateRange,
  validateConsentPermissionDateRange,
} from "./nha-cm-timestamp.js";

describe("formatNhaCmTimestamp", () => {
  it("normalizes to millisecond Zulu format", () => {
    expect(formatNhaCmTimestamp("2026-01-01T00:00:00Z")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});

describe("normalizeConsentPermissionDateRange", () => {
  it("bumps past midnight UTC end to now", () => {
    const pastMidnight = "2026-01-15T00:00:00.000Z";
    const result = normalizeConsentPermissionDateRange({
      from: "2026-01-01T00:00:00.000Z",
      to: pastMidnight,
    });
    expect(result.adjustedToFromMidnight).toBe(true);
    expect(new Date(result.to).getTime()).toBeGreaterThan(
      new Date(pastMidnight).getTime(),
    );
  });

  it("leaves explicit time-of-day end unchanged", () => {
    const to = "2026-05-25T12:10:00.000Z";
    const result = normalizeConsentPermissionDateRange({
      from: "2026-01-01T00:00:00.000Z",
      to,
    });
    expect(result).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to,
      adjustedToFromMidnight: false,
    });
  });
});

describe("validateConsentPermissionDateRange", () => {
  it("rejects future end date", () => {
    expect(() =>
      validateConsentPermissionDateRange({
        from: "2026-01-01T00:00:00.000Z",
        to: "2099-01-01T00:00:00.000Z",
      }),
    ).toThrow(/today or earlier/i);
  });
});

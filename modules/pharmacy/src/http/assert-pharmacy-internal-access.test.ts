import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertPharmacyInternalAccess } from "./assert-pharmacy-internal-access.js";

describe("assertPharmacyInternalAccess", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
    delete process.env.PHARMACY_INTERNAL_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("allows access in dev when PHARMACY_INTERNAL_API_KEY is unset", () => {
    expect(() => assertPharmacyInternalAccess({ headers: {} } as never)).not.toThrow();
  });

  it("rejects when key is configured but header is wrong", () => {
    process.env.PHARMACY_INTERNAL_API_KEY = "secret";
    expect(() => assertPharmacyInternalAccess({ headers: {} } as never)).toThrow(
      /x-pharmacy-internal-key/,
    );
  });

  it("allows when header matches configured key", () => {
    process.env.PHARMACY_INTERNAL_API_KEY = "secret";
    expect(() =>
      assertPharmacyInternalAccess({
        headers: { "x-pharmacy-internal-key": "secret" },
      } as never),
    ).not.toThrow();
  });
});

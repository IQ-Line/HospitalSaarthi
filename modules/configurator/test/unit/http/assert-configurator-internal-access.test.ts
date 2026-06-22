import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { assertConfiguratorInternalAccess } from "../../../src/http/assert-configurator-internal-access.js";

describe("assertConfiguratorInternalAccess", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
    delete process.env.CONFIGURATOR_INTERNAL_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("allows access in dev when CONFIGURATOR_INTERNAL_API_KEY is unset", () => {
    expect(() =>
      assertConfiguratorInternalAccess({ headers: {} } as never),
    ).not.toThrow();
  });

  it("rejects when key is configured but header is wrong", () => {
    process.env.CONFIGURATOR_INTERNAL_API_KEY = "secret";
    expect(() =>
      assertConfiguratorInternalAccess({ headers: {} } as never),
    ).toThrow(/x-configurator-internal-key/);
  });

  it("allows when header matches configured key", () => {
    process.env.CONFIGURATOR_INTERNAL_API_KEY = "secret";
    expect(() =>
      assertConfiguratorInternalAccess({
        headers: { "x-configurator-internal-key": "secret" },
      } as never),
    ).not.toThrow();
  });
});

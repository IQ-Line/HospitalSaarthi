import { afterEach, describe, expect, it } from "vitest";
import { InMemoryLinkOtpStore } from "./link-otp-store.js";

describe("InMemoryLinkOtpStore", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("throws in production/staging NODE_ENV", () => {
    process.env["NODE_ENV"] = "production";
    expect(() => new InMemoryLinkOtpStore()).toThrow(/not allowed/);
  });

  it("allows construction in development", () => {
    process.env["NODE_ENV"] = "development";
    expect(() => new InMemoryLinkOtpStore()).not.toThrow();
  });
});

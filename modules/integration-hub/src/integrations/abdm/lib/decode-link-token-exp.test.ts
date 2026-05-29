import { describe, expect, it } from "vitest";
import { decodeLinkTokenExpSeconds, linkTokenExpiresAt } from "./decode-link-token-exp.js";

describe("decodeLinkTokenExp", () => {
  it("reads exp from JWT payload segment", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ exp: 1_700_000_000 })).toString("base64url");
    const token = `${header}.${payload}.sig`;
    expect(decodeLinkTokenExpSeconds(token)).toBe(1_700_000_000);
    expect(linkTokenExpiresAt(token).getTime()).toBe(1_700_000_000_000);
  });

  it("falls back when token is not a JWT", () => {
    const before = Date.now();
    const exp = linkTokenExpiresAt("not-a-jwt");
    expect(exp.getTime()).toBeGreaterThan(before);
  });
});

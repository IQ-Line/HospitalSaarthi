import { afterEach, describe, expect, it } from "vitest";
import { validateAuthConfig } from "@hims/ts-sdk-identity";

const ENV_KEYS = [
  "JWKS_URL",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "PARTNER_JWKS_URL",
  "PARTNER_JWT_ISSUER",
  "PARTNER_JWT_AUDIENCE",
  "PARTNER_JWT_MAX_TOKEN_AGE_SECONDS",
] as const;

function expectedJwksForIssuer(issuer: string): string {
  return `${issuer.replace(/\/+$/, "")}/api/auth/.well-known/jwks.json`;
}

function setAuthEnv(issuer: string, jwksUrl?: string): void {
  process.env.JWT_ISSUER = issuer;
  process.env.JWT_AUDIENCE = "hims-platform";
  process.env.JWKS_URL = jwksUrl ?? expectedJwksForIssuer(issuer);
}

describe("validateAuthConfig", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("accepts JWKS_URL derived from JWT_ISSUER", () => {
    setAuthEnv("http://localhost:3000");
    expect(validateAuthConfig()).toEqual({
      issuer: "http://localhost:3000",
      jwksUrl: "http://localhost:3000/api/auth/.well-known/jwks.json",
      audience: "hims-platform",
    });
  });

  it("strips trailing slashes from issuer when building expected JWKS", () => {
    setAuthEnv("http://localhost:3000/");
    expect(validateAuthConfig().jwksUrl).toBe(
      "http://localhost:3000/api/auth/.well-known/jwks.json",
    );
  });

  it("fails fast when JWKS_URL does not match issuer", () => {
    setAuthEnv("http://localhost:3000", "http://localhost:3005/api/auth/.well-known/jwks.json");
    expect(() => validateAuthConfig()).toThrow(/JWKS_URL must equal/);
  });

  it("includes partner JWT config when all partner env vars are set", () => {
    setAuthEnv("http://localhost:3000");
    process.env.PARTNER_JWKS_URL = "http://localhost:3010/.well-known/jwks.json";
    process.env.PARTNER_JWT_ISSUER = "https://integration-hub.hims.local";
    process.env.PARTNER_JWT_AUDIENCE = "hims-partner";

    expect(validateAuthConfig()).toEqual({
      issuer: "http://localhost:3000",
      jwksUrl: "http://localhost:3000/api/auth/.well-known/jwks.json",
      audience: "hims-platform",
      partner: {
        jwksUrl: "http://localhost:3010/.well-known/jwks.json",
        issuer: "https://integration-hub.hims.local",
        audience: "hims-partner",
      },
    });
  });

  it("fails when only partial partner env vars are set", () => {
    setAuthEnv("http://localhost:3000");
    process.env.PARTNER_JWT_ISSUER = "https://integration-hub.hims.local";
    expect(() => validateAuthConfig()).toThrow(/must be set together/);
  });
});

import type { IdentityPluginOptions, PartnerJwtConfig } from "../types.js";

const AUTH_CONFIG_INVALID =
  "AUTH_CONFIG_INVALID: missing issuer/audience/jwksUrl/cerbosUrl";

/** Canonical JWKS path under the JWT issuer origin (better-auth via BFF). */
export function expectedJwksUrlForIssuer(issuer: string): string {
  const base = issuer.replace(/\/+$/, "");
  return `${base}/api/auth/.well-known/jwks.json`;
}

function readJwtAuthEnv(): {
  jwksUrl: string;
  issuer: string;
  audience: string;
} {
  const jwksUrl = process.env.JWKS_URL?.trim();
  const issuer = process.env.JWT_ISSUER?.trim();
  const audience = process.env.JWT_AUDIENCE?.trim();

  if (!jwksUrl || !issuer || !audience) {
    throw new Error(AUTH_CONFIG_INVALID);
  }

  const expectedJwks = expectedJwksUrlForIssuer(issuer);
  if (jwksUrl !== expectedJwks) {
    throw new Error(
      `AUTH_CONFIG_INVALID: JWKS_URL must equal ${expectedJwks} (JWT_ISSUER + /api/auth/.well-known/jwks.json). ` +
        `Configured issuer=${issuer}, jwksUrl=${jwksUrl}`,
    );
  }

  return { jwksUrl, issuer, audience };
}

function readPartnerJwtEnv(): PartnerJwtConfig | undefined {
  const jwksUrl = process.env.PARTNER_JWKS_URL?.trim();
  const issuer = process.env.PARTNER_JWT_ISSUER?.trim();
  const audience = process.env.PARTNER_JWT_AUDIENCE?.trim();

  if (!jwksUrl && !issuer && !audience) {
    return undefined;
  }

  if (!jwksUrl || !issuer || !audience) {
    throw new Error(
      "AUTH_CONFIG_INVALID: PARTNER_JWKS_URL, PARTNER_JWT_ISSUER, and PARTNER_JWT_AUDIENCE must be set together",
    );
  }

  const maxTokenAgeRaw = process.env.PARTNER_JWT_MAX_TOKEN_AGE_SECONDS?.trim();
  const maxTokenAgeSeconds =
    maxTokenAgeRaw !== undefined && maxTokenAgeRaw.length > 0
      ? Number(maxTokenAgeRaw)
      : undefined;

  if (
    maxTokenAgeSeconds !== undefined &&
    (!Number.isFinite(maxTokenAgeSeconds) || maxTokenAgeSeconds <= 0)
  ) {
    throw new Error(
      "AUTH_CONFIG_INVALID: PARTNER_JWT_MAX_TOKEN_AGE_SECONDS must be a positive number",
    );
  }

  return {
    jwksUrl,
    issuer,
    audience,
    ...(maxTokenAgeSeconds !== undefined ? { maxTokenAgeSeconds } : {}),
  };
}

/** Validates JWKS_URL, JWT_ISSUER, JWT_AUDIENCE and optional partner JWT env vars. */
export function validateAuthConfig(): IdentityPluginOptions {
  const auth = readJwtAuthEnv();
  const partner = readPartnerJwtEnv();
  return partner === undefined ? auth : { ...auth, partner };
}

/** Validates JWT env vars plus CERBOS_URL for services that register authz/Cerbos. */
export function validateAuthAndPdpConfig(): IdentityPluginOptions & { cerbosUrl: string } {
  const auth = validateAuthConfig();
  const cerbosUrl = process.env.CERBOS_URL?.trim();
  if (!cerbosUrl) {
    throw new Error(AUTH_CONFIG_INVALID);
  }
  return { ...auth, cerbosUrl };
}

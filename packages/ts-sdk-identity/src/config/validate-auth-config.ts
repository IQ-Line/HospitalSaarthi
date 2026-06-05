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

function readPartnerJwtEnv(): {
  partnerJwksUrl?: string;
  partnerIssuer?: string;
  partnerMaxTokenAgeSeconds?: number;
} {
  const partnerJwksUrl = process.env.PARTNER_JWKS_URL?.trim();
  const partnerIssuer = process.env.PARTNER_JWT_ISSUER?.trim();
  if (!partnerJwksUrl && !partnerIssuer) {
    return {};
  }
  if (!partnerJwksUrl || !partnerIssuer) {
    throw new Error(
      "AUTH_CONFIG_INVALID: PARTNER_JWKS_URL and PARTNER_JWT_ISSUER must both be set when partner JWT verification is enabled",
    );
  }
  return {
    partnerJwksUrl,
    partnerIssuer,
    partnerMaxTokenAgeSeconds: 120,
  };
}

/** Validates JWKS_URL, JWT_ISSUER, JWT_AUDIENCE (no defaults). */
export function validateAuthConfig(): {
  jwksUrl: string;
  issuer: string;
  audience: string;
  partnerJwksUrl?: string;
  partnerIssuer?: string;
  partnerMaxTokenAgeSeconds?: number;
} {
  return { ...readJwtAuthEnv(), ...readPartnerJwtEnv() };
}

/** Validates JWT env vars plus CERBOS_URL for services that register authz/Cerbos. */
export function validateAuthAndPdpConfig(): {
  jwksUrl: string;
  issuer: string;
  audience: string;
  cerbosUrl: string;
} {
  const auth = readJwtAuthEnv();
  const cerbosUrl = process.env.CERBOS_URL?.trim();
  if (!cerbosUrl) {
    throw new Error(AUTH_CONFIG_INVALID);
  }
  return { ...auth, cerbosUrl };
}

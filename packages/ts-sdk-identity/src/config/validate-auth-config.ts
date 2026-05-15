const AUTH_CONFIG_INVALID =
  "AUTH_CONFIG_INVALID: missing issuer/audience/jwksUrl/cerbosUrl";

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

  return { jwksUrl, issuer, audience };
}

/** Validates JWKS_URL, JWT_ISSUER, JWT_AUDIENCE (no defaults). */
export function validateAuthConfig(): {
  jwksUrl: string;
  issuer: string;
  audience: string;
} {
  return readJwtAuthEnv();
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

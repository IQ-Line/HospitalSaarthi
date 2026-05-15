const AUTH_CONFIG_INVALID = "AUTH_CONFIG_INVALID: missing issuer/audience/jwksUrl/cerbosUrl";
function readJwtAuthEnv() {
    const jwksUrl = process.env.JWKS_URL?.trim();
    const issuer = process.env.JWT_ISSUER?.trim();
    const audience = process.env.JWT_AUDIENCE?.trim();
    if (!jwksUrl || !issuer || !audience) {
        throw new Error(AUTH_CONFIG_INVALID);
    }
    return { jwksUrl, issuer, audience };
}
/** Validates JWKS_URL, JWT_ISSUER, JWT_AUDIENCE (no defaults). */
export function validateAuthConfig() {
    return readJwtAuthEnv();
}
/** Validates JWT env vars plus CERBOS_URL for services that register authz/Cerbos. */
export function validateAuthAndPdpConfig() {
    const auth = readJwtAuthEnv();
    const cerbosUrl = process.env.CERBOS_URL?.trim();
    if (!cerbosUrl) {
        throw new Error(AUTH_CONFIG_INVALID);
    }
    return { ...auth, cerbosUrl };
}
//# sourceMappingURL=validate-auth-config.js.map
/** Validates JWKS_URL, JWT_ISSUER, JWT_AUDIENCE (no defaults). */
export declare function validateAuthConfig(): {
    jwksUrl: string;
    issuer: string;
    audience: string;
};
/** Validates JWT env vars plus CERBOS_URL for services that register authz/Cerbos. */
export declare function validateAuthAndPdpConfig(): {
    jwksUrl: string;
    issuer: string;
    audience: string;
    cerbosUrl: string;
};
//# sourceMappingURL=validate-auth-config.d.ts.map